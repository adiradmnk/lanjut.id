'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

export interface GradientWavesProps {
  primaryTeal?: string;    // #007979
  lightTeal?: string;      // #24B1B1
  warmCream?: string;      // #FFE2AF
  coralOrange?: string;    // #E37434
  speed?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  grainIntensity?: number;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Elegant, organic 2D flowing gradient mesh (Stripe-style fluid silk mesh)
const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uOpacity;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform bool uEnableMouse;
uniform vec3 uPrimaryTeal;
uniform vec3 uLightTeal;
uniform vec3 uWarmCream;
uniform vec3 uCoralOrange;
out vec4 fragColor;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Smooth noise function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractional Brownian Motion for silky fluid clouds
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 4; ++i) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 p = uv;
  p.x *= aspect;

  float t = iTime * uSpeed * 0.25;

  // Gentle cursor influence
  vec2 mouseInfluence = vec2(0.0);
  if (uEnableMouse) {
    mouseInfluence = (uMouse - 0.5) * 0.15;
  }

  // Domain warping for smooth Stripe atmospheric fluid flows
  vec2 q = vec2(
    fbm(p * 1.8 + t * 0.4 + mouseInfluence),
    fbm(p * 1.8 + vec2(5.2, 1.3) - t * 0.3)
  );

  vec2 r = vec2(
    fbm(p * 2.2 + 3.0 * q + vec2(1.7, 9.2) + 0.25 * t),
    fbm(p * 2.2 + 3.0 * q + vec2(8.3, 2.8) - 0.2 * t)
  );

  float flow = fbm(p * 1.5 + 2.5 * r);

  // Organic blended color stops across the canvas
  // Base palette: #007979, #24B1B1, #FFE2AF, #E37434
  vec3 col = mix(uPrimaryTeal, uLightTeal, clamp(q.x * 1.2, 0.0, 1.0));
  col = mix(col, uWarmCream, clamp(r.y * 1.4 - 0.1, 0.0, 1.0));
  col = mix(col, uCoralOrange, clamp(flow * 1.5 - 0.4, 0.0, 1.0));

  // Natural vignette & vertical dissipation towards clean white bottom
  float verticalFade = smoothstep(1.0, 0.2, uv.y);
  float edgeFade = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
  
  // Blend smoothly into pure white canvas (#FFFFFF)
  float alpha = clamp(verticalFade * edgeFade * 0.72 * uOpacity, 0.0, 1.0);
  
  // Subtle film grain
  float grain = (hash21(gl_FragCoord.xy + mod(iTime, 10.0) * 17.0) - 0.5) * uGrainIntensity;
  
  vec3 finalColor = mix(vec3(1.0, 1.0, 1.0), col + grain, alpha);
  fragColor = vec4(finalColor, 1.0);
}
`;

type GradientWavesCtx = {
  renderer: InstanceType<typeof Renderer>;
  program: InstanceType<typeof Program>;
  mesh: InstanceType<typeof Mesh>;
};
const ctxMap = new WeakMap<HTMLDivElement, GradientWavesCtx>();

const GradientWaves: React.FC<GradientWavesProps> = ({
  primaryTeal = '#007979',
  lightTeal = '#24B1B1',
  warmCream = '#FFE2AF',
  coralOrange = '#E37434',
  speed = 0.5,
  opacity = 1.0,
  mouseInteraction = true,
  grainIntensity = 0.02,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const enableMouseRef = useRef<boolean>(mouseInteraction);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: true,
      dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)
    });

    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: speed },
        uOpacity: { value: opacity },
        uGrainIntensity: { value: grainIntensity },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uEnableMouse: { value: true },
        uPrimaryTeal: { value: new Float32Array(hexToRgb(primaryTeal)) },
        uLightTeal: { value: new Float32Array(hexToRgb(lightTeal)) },
        uWarmCream: { value: new Float32Array(hexToRgb(warmCream)) },
        uCoralOrange: { value: new Float32Array(hexToRgb(coralOrange)) }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctxMap.set(container, { renderer, program, mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      const res = (program.uniforms.iResolution as { value: Float32Array }).value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    const currentMouse: [number, number] = [0.5, 0.5];
    const targetMouse: [number, number] = [0.5, 0.5];

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse[0] = (e.clientX - rect.left) / rect.width;
      targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    const onPointerLeave = () => {
      targetMouse[0] = 0.5;
      targetMouse[1] = 0.5;
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const t0 = performance.now();

    const loop = (t: number) => {
      (program.uniforms.iTime as { value: number }).value = (t - t0) * 0.001;
      const tx = enableMouseRef.current ? targetMouse[0] : 0.5;
      const ty = enableMouseRef.current ? targetMouse[1] : 0.5;
      currentMouse[0] += 0.05 * (tx - currentMouse[0]);
      currentMouse[1] += 0.05 * (ty - currentMouse[1]);
      const m = (program.uniforms.uMouse as { value: Float32Array }).value;
      m[0] = currentMouse[0];
      m[1] = currentMouse[1];
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    const tryStart = () => {
      if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
    };
    const tryStop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        isVisible ? tryStart() : tryStop();
      },
      { threshold: 0 }
    );
    io.observe(container);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      isPageVisible ? tryStart() : tryStop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    tryStart();

    return () => {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      ctxMap.delete(container);
      try {
        container.removeChild(canvas);
      } catch {}
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = ctxMap.get(container);
    if (!ctx) return;
    const { program } = ctx;
    const u = program.uniforms as Record<string, { value: any }>;

    enableMouseRef.current = mouseInteraction;

    u.uSpeed.value = speed;
    u.uOpacity.value = opacity;
    u.uGrainIntensity.value = grainIntensity;
    u.uEnableMouse.value = mouseInteraction;

    const pt = u.uPrimaryTeal.value as Float32Array;
    const lt = u.uLightTeal.value as Float32Array;
    const wc = u.uWarmCream.value as Float32Array;
    const co = u.uCoralOrange.value as Float32Array;

    const ptRgb = hexToRgb(primaryTeal);
    const ltRgb = hexToRgb(lightTeal);
    const wcRgb = hexToRgb(warmCream);
    const coRgb = hexToRgb(coralOrange);

    pt[0] = ptRgb[0]; pt[1] = ptRgb[1]; pt[2] = ptRgb[2];
    lt[0] = ltRgb[0]; lt[1] = ltRgb[1]; lt[2] = ltRgb[2];
    wc[0] = wcRgb[0]; wc[1] = wcRgb[1]; wc[2] = wcRgb[2];
    co[0] = coRgb[0]; co[1] = coRgb[1]; co[2] = coRgb[2];
  }, [
    primaryTeal,
    lightTeal,
    warmCream,
    coralOrange,
    speed,
    opacity,
    grainIntensity,
    mouseInteraction
  ]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()} />;
};

export default GradientWaves;
