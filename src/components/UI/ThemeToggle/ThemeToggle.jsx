import './ThemeToggle.css';

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      <svg
        className="theme-toggle__icon theme-toggle__icon--sun"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="12" y1="1.8" x2="12" y2="4.2" />
          <line x1="12" y1="19.8" x2="12" y2="22.2" />
          <line x1="4.2" y1="4.2" x2="5.9" y2="5.9" />
          <line x1="18.1" y1="18.1" x2="19.8" y2="19.8" />
          <line x1="1.8" y1="12" x2="4.2" y2="12" />
          <line x1="19.8" y1="12" x2="22.2" y2="12" />
          <line x1="4.2" y1="19.8" x2="5.9" y2="18.1" />
          <line x1="18.1" y1="5.9" x2="19.8" y2="4.2" />
        </g>
      </svg>

      <svg
        className="theme-toggle__icon theme-toggle__icon--moon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20.5 14.4A8.5 8.5 0 1 1 9.6 3.5a7 7 0 0 0 10.9 10.9Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

export default ThemeToggle;