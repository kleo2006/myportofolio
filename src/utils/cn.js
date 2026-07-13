/**
 * Joins class names conditionally, skipping falsy values.
 * cn('navbar__link', isActive && 'navbar__link--active')
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}