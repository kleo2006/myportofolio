const ICONS = {
  layout: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.4" />
      <path d="M3 9.5h18" />
      <path d="M9 9.5V20" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <circle cx="7" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="7" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  tool: (
    <>
      <path d="M14.7 6.3a3.5 3.5 0 0 1-4.6 4.6L4.5 16.5a1.7 1.7 0 0 0 2.4 2.4l5.6-5.6a3.5 3.5 0 0 1 4.6-4.6l-2.2 2.2-1.6-1.6Z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8Z" />
    </>
  ),
};

function CategoryIcon({ name, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS.layout}
    </svg>
  );
}

export default CategoryIcon;