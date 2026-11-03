// Central source of truth for primary navigation.
// Sections are added incrementally; the Navbar renders whatever exists here
// and the useActiveSection hook simply skips ids that aren't on the page yet.
export const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
];