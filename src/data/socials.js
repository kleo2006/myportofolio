import { SITE_CONFIG } from './siteConfig';

export const SOCIAL_LINKS = [
  { label: 'GitHub', icon: 'github', href: SITE_CONFIG.github },
  { label: 'LinkedIn', icon: 'linkedin', href: SITE_CONFIG.linkedin },
  { label: 'Email', icon: 'mail', href: `mailto:${SITE_CONFIG.email}` },
];