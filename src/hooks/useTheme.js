import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'portfolio-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Reads/writes the active theme ('light' | 'dark') and reflects it onto
 * `<html data-theme="...">`, which is what variables.css keys off of.
 * Persists the user's explicit choice; falls back to system preference
 * the first time they visit.
 */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}