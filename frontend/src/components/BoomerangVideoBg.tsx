'use client';

import React, { useEffect, useRef, useState } from 'react';

interface BoomerangVideoBgProps {
  videoUrl: string;
}

export default function BoomerangVideoBg({ videoUrl }: BoomerangVideoBgProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [framesReady, setFramesReady] = useState(false);

  // Parallax scroll effect: translate & scale slightly on user scroll
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || window.pageYOffset;
          if (containerRef.current) {
            // Subtle cinematic parallax translation + zoom
            const translateY = scrollY * 0.32;
            const scale = 1.15 + scrollY * 0.00035;
            containerRef.current.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const capturedFrames: ImageBitmap[] = [];
    let isCapturing = true;
    let animId = 0;
    let lastTime = -1;

    // Offscreen canvas for frame extraction (capped at 960px width)
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');

    const captureFrame = async () => {
      if (!isCapturing || !video) return;

      if (video.videoWidth > 0 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const targetWidth = Math.min(video.videoWidth, 960);
        const scale = targetWidth / video.videoWidth;
        const targetHeight = Math.round(video.videoHeight * scale);

        if (offscreen.width !== targetWidth || offscreen.height !== targetHeight) {
          offscreen.width = targetWidth;
          offscreen.height = targetHeight;
        }

        if (offCtx) {
          offCtx.drawImage(video, 0, 0, targetWidth, targetHeight);
          try {
            const bitmap = await createImageBitmap(offscreen);
            capturedFrames.push(bitmap);
          } catch {
            // fallback
          }
        }
      }

      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        animId = requestAnimationFrame(captureFrame);
      }
    };

    const handlePlay = () => {
      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        animId = requestAnimationFrame(captureFrame);
      }
    };

    const handleEnded = () => {
      isCapturing = false;
      if (capturedFrames.length > 5) {
        setFramesReady(true);
        startBoomerang();
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);

    // Ping-pong boomerang loop at 30fps
    let boomerangTimer: any = null;
    let frameIndex = 0;
    let forward = true;

    const startBoomerang = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || capturedFrames.length === 0) return;

      canvas.width = capturedFrames[0].width;
      canvas.height = capturedFrames[0].height;

      boomerangTimer = setInterval(() => {
        if (capturedFrames.length === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(capturedFrames[frameIndex], 0, 0);

        if (forward) {
          frameIndex++;
          if (frameIndex >= capturedFrames.length - 1) {
            forward = false;
          }
        } else {
          frameIndex--;
          if (frameIndex <= 0) {
            forward = true;
          }
        }
      }, 1000 / 30);
    };

    return () => {
      isCapturing = false;
      if (animId) cancelAnimationFrame(animId);
      if (boomerangTimer) clearInterval(boomerangTimer);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      capturedFrames.forEach((bm) => bm.close?.());
    };
  }, [videoUrl]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 origin-top overflow-hidden pointer-events-none transition-transform will-change-transform duration-75 ease-out"
      style={{
        transform: 'translate3d(0, 0, 0) scale(1.15)',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)',
      }}
    >
      {/* Live Video while capturing */}
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover object-top transition-opacity duration-300 ${
          framesReady ? 'hidden' : 'block'
        }`}
      />

      {/* Canvas for 30fps forward-reverse boomerang playback */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover object-top ${
          framesReady ? 'block' : 'hidden'
        }`}
      />
    </div>
  );
}
