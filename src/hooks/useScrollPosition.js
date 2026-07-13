import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether the page has scrolled past a threshold, and which
 * direction the user is currently scrolling in. Used by the Navbar to
 * shrink its height and hide itself when the user scrolls down.
 */
export function useScrollPosition(threshold = 24) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [direction, setDirection] = useState('up');
  const lastY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > threshold);

      if (Math.abs(currentY - lastY.current) > 6) {
        setDirection(currentY > lastY.current ? 'down' : 'up');
        lastY.current = currentY;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return { isScrolled, direction };
}