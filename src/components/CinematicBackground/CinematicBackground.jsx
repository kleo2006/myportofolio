import { useEffect, useRef, useState } from 'react';
import './CinematicBackground.css';

/*
 * CinematicBackground
 * --------------------
 * A self-contained, additive visual layer. It does not read from or modify
 * any existing component, hook, or style. It watches `<html data-theme>`
 * via MutationObserver so it can re-theme itself, without touching
 * `useTheme.js` or `Navbar.jsx`.
 *
 * Structure: a handful of CSS-animated gradient/grid/glass layers for the
 * "cinematic" atmosphere, plus a single <canvas> for a lightweight,
 * time-based particle system. Everything is `position: fixed`, `inset: 0`,
 * `pointer-events: none`, and sits at a negative z-index — the same
 * technique already used by the grain overlay in `index.css` — so it never
 * affects layout, clicks, or scroll.
 *
 * Both dark and light themes get the full treatment (aurora, mesh, grid,
 * glass, streaks, particles, vignette) — only the palette/opacity values
 * differ, driven entirely by CSS via `html[data-theme]` selectors and by
 * swapping the particle color layers here in JS.
 */

// Dark theme: particles follow the same luxury hierarchy as the aurora —
// electric blue leads, cyan adds fresh near-field sparkle, violet stays a
// rare atmospheric accent (~3%, not 5%), and a handful of warm-white glints
// (~1% of the field) carry the "premium bloom" highlight.
const PARTICLE_LAYERS_DARK = [
  { count: 46, minR: 0.5, maxR: 1.3, speed: 0.05, depth: 0.25, rgb: '90,168,255', alpha: [0.18, 0.5] },   // far, electric blue (primary)
  { count: 16, minR: 1.1, maxR: 2.1, speed: 0.11, depth: 0.55, rgb: '154,137,255', alpha: [0.1, 0.28] },  // mid, violet (rare, quiet)
  { count: 16, minR: 1.7, maxR: 3.4, speed: 0.2, depth: 1, rgb: '109,235,255', alpha: [0.18, 0.48] },     // near, cyan (secondary)
  { count: 5, minR: 1.2, maxR: 2.2, speed: 0.14, depth: 0.8, rgb: '248,250,252', alpha: [0.1, 0.26] },    // rare, warm-white glints
];

// Light theme: same hue family, deeper and more muted so dots read as soft
// ink flecks against a bright wash instead of a bright-on-white glare.
const PARTICLE_LAYERS_LIGHT = [
  { count: 40, minR: 0.5, maxR: 1.2, speed: 0.05, depth: 0.25, rgb: '90,168,255', alpha: [0.1, 0.26] },   // far, electric blue
  { count: 16, minR: 1.0, maxR: 1.9, speed: 0.1, depth: 0.55, rgb: '154,137,255', alpha: [0.06, 0.16] },  // mid, violet
  { count: 14, minR: 1.5, maxR: 3.0, speed: 0.18, depth: 1, rgb: '86,230,255', alpha: [0.09, 0.22] },     // near, cyan
];

function getParticleBudget(width) {
  let scale = 1;
  if (width < 480) scale = 0.3;
  else if (width < 768) scale = 0.5;
  else if (width < 1100) scale = 0.75;
  if (
    typeof navigator !== 'undefined' &&
    navigator.hardwareConcurrency &&
    navigator.hardwareConcurrency <= 4
  ) {
    scale *= 0.7;
  }
  return scale;
}

function CinematicBackground() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark'
  );

  // Track theme without touching existing theme logic anywhere else.
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.getAttribute('data-theme') === 'dark');
    const observer = new MutationObserver(() => {
      setIsDark(root.getAttribute('data-theme') === 'dark');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Mouse + scroll drive a couple of CSS custom properties; the CSS layers
  // consume these for parallax/light-direction shifts with their own
  // transitions, so we don't hand-roll per-frame easing here.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    let ticking = false;
    let pendingX = 0.5;
    let pendingY = 0.5;

    const applyMouseVars = () => {
      el.style.setProperty('--mx', pendingX.toFixed(4));
      el.style.setProperty('--my', pendingY.toFixed(4));
      ticking = false;
    };

    const onMove = (e) => {
      pendingX = e.clientX / window.innerWidth;
      pendingY = e.clientY / window.innerHeight;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyMouseVars);
      }
    };

    let scrollTicking = false;
    const onScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        el.style.setProperty('--sc', p.toFixed(4));
        scrollTicking = false;
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Particle canvas: time-based rAF loop, paused only when the tab is
  // hidden or the user prefers reduced motion — it now runs in both themes,
  // just swapping which color layers it draws from.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layerSet = isDark ? PARTICLE_LAYERS_DARK : PARTICLE_LAYERS_LIGHT;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let mouseX = 0.5;
    let mouseY = 0.5;
    let running = false;
    let raf = null;
    let lastTime = performance.now();

    const onMove = (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    };

    const buildParticles = () => {
      const scale = getParticleBudget(width);
      particles = [];
      layerSet.forEach((layer) => {
        const n = Math.max(3, Math.round(layer.count * scale));
        const [aMin, aMax] = layer.alpha;
        for (let i = 0; i < n; i += 1) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: layer.minR + Math.random() * (layer.maxR - layer.minR),
            baseSpeed: layer.speed * (0.6 + Math.random() * 0.8),
            depth: layer.depth,
            rgb: layer.rgb,
            phase: Math.random() * Math.PI * 2,
            drift: (Math.random() - 0.5) * 0.5,
            opacityBase: aMin + Math.random() * (aMax - aMin),
          });
        }
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
    };

    const draw = (now) => {
      if (!running) return;
      const dt = Math.min(now - lastTime, 48);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.phase += dt * 0.0006;
        p.y -= p.baseSpeed * (dt * 0.06);
        p.x += Math.sin(p.phase) * p.drift * (dt * 0.02);

        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;

        const parallaxX = (mouseX - 0.5) * 26 * p.depth;
        const parallaxY = (mouseY - 0.5) * 26 * p.depth;
        const flicker = 0.6 + 0.4 * Math.sin(p.phase * 1.7);
        const alpha = p.opacityBase * flicker;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.rgb},${alpha.toFixed(3)})`;
        ctx.arc(p.x + parallaxX, p.y + parallaxY, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(draw);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    if (!reduceMotion) start();

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isDark]);

  return (
    <div ref={containerRef} className="cinematic-bg" aria-hidden="true">
      <div className="cinematic-bg__base" />
      <div className="cinematic-bg__aurora cinematic-bg__aurora--a" />
      <div className="cinematic-bg__aurora cinematic-bg__aurora--b" />
      <div className="cinematic-bg__aurora cinematic-bg__aurora--c" />
      <div className="cinematic-bg__mesh" />
      <div className="cinematic-bg__grid" />
      <div className="cinematic-bg__glass cinematic-bg__glass--a" />
      <div className="cinematic-bg__glass cinematic-bg__glass--b" />
      <div className="cinematic-bg__streak cinematic-bg__streak--a" />
      <div className="cinematic-bg__streak cinematic-bg__streak--b" />
      <canvas ref={canvasRef} className="cinematic-bg__particles" />
      <div className="cinematic-bg__vignette" />
    </div>
  );
}

export default CinematicBackground;