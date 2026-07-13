import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `end` once the target element scrolls
 * into view. Respects prefers-reduced-motion by snapping straight to
 * the final value.
 */
export function useCountUp(end, { duration = 1200 } = {}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRun.current) return;
        hasRun.current = true;

        if (prefersReducedMotion) {
          setValue(end);
          return;
        }

        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [end, duration]);

  return [value, ref];
}