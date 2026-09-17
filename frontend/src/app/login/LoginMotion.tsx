'use client';

import { useEffect, useRef } from 'react';
import styles from './page.module.css';

const motionUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_075824_7c8a2ef3-826c-43ca-81a1-162429faa306.mp4';

export default function LoginMotion() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncPlayback = () => {
      video.muted = true;
      if (document.hidden || reducedMotion.matches) {
        video.pause();
      } else {
        // Keep the first frame visible if the browser declines autoplay.
        void video.play().catch(() => {});
      }
    };

    video.addEventListener('canplay', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
    reducedMotion.addEventListener('change', syncPlayback);
    syncPlayback();

    return () => {
      video.removeEventListener('canplay', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      reducedMotion.removeEventListener('change', syncPlayback);
      video.pause();
    };
  }, []);

  return (
    <video ref={videoRef} className={styles.video} autoPlay muted loop playsInline preload="auto" tabIndex={-1}>
      <source src={motionUrl} type="video/mp4" />
    </video>
  );
}
