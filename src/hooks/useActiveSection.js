import { useEffect, useState } from 'react';

/**
 * Observes whichever of the given section ids currently exist in the DOM
 * and returns the one most visible in the viewport. Sections that haven't
 * been built yet are silently skipped, so this is safe to wire up early.
 */
export function useActiveSection(ids = []) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id.replace('#', '')))
      .filter(Boolean);

    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) setActiveId(`#${visible.target.id}`);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}