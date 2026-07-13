import { useEffect, useRef, useState } from 'react';

/**
 * Attaches to any element and flips `isVisible` to true the first time it
 * scrolls into view, then stops observing. Pair with the `.reveal` /
 * `.reveal--visible` classes in index.css for a fade-and-rise entrance.
 */
export function useScrollReveal({ threshold = 0.15 } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}