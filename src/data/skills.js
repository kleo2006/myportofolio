// `level` is qualitative on purpose (1-3) rather than a fake precise
// percentage — it drives how many of the 3 indicator dots render filled.
export const SKILL_CATEGORIES = [
  {
    title: 'Frontend',
    icon: 'layout',
    skills: [
      { name: 'React', level: 3 },
      { name: 'JavaScript (ES6+)', level: 3 },
      { name: 'Responsive / CSS', level: 3 },
      { name: 'HTML5', level: 3 },
    ],
  },
  {
    title: 'Backend',
    icon: 'server',
    skills: [
      { name: 'Node.js', level: 2 },
      { name: 'Express', level: 2 },
      { name: 'Stripe', level: 2 },
      { name: 'SQL', level: 2 },
    ],
  },
  {
    title: 'Tools & Workflow',
    icon: 'tool',
    skills: [
      { name: 'Git & GitHub', level: 3 },
      { name: 'Vite', level: 3 },
      { name: 'Deployment (Cloudflare, Render)', level: 2 },
      { name: 'Claude code', level: 2 },
    ],
  },
  {
    title: 'Practices',
    icon: 'compass',
    skills: [
      { name: 'Performance optimization', level: 3 },
      { name: 'UI / UX principles', level: 2 },
      { name: 'Accessibility', level: 2 },
      { name: 'Mobile-first design', level: 3 },
    ],
  },
];