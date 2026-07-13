import northwindImg from '../assets/images/northwind.png';
import tomatoImg from '../assets/images/tomato1.png';
import movieImg from '../assets/images/movie-app.png';

export const PROJECTS = [
  {
    title: 'NorthWind IT Services',
    description:
      'Corporate site for an IT services and consulting company — services, pricing tiers, testimonials, and a contact flow, plus an AI-powered chat widget wired into the same brand system.',
    tech: ['React', 'Vite', 'Framer Motion',  'OpenAI API'],
    features: [
      'AI chat widget with a custom system prompt',
      'Stripe-ready pricing tiers',
      'Deployed on Cloudflare Pages',
    ],
    accent: 'navy',
    image: northwindImg,
    liveUrl: 'https://northwind-website-3j7.pages.dev',
    githubUrl: 'https://github.com/kleo2006/northwind-website',
  },
  {
    title: 'Tomato — Food Delivery',
    description:
      'Full-stack food ordering app: browse by category, manage a live cart, and check out with real payments, backed by a JWT-authenticated API.',
    tech: ['React', 'Node.js', 'Express', 'Stripe'],
    features: [
      'JWT authentication',
      'Persistent cart & checkout with Stripe',
      'Category-based menu browsing',
    ],
    accent: 'coral',
    image: tomatoImg,
    liveUrl: 'https://food-delivery-cte.pages.dev',
    githubUrl: 'https://github.com/kleo2006/food-delivery',
  },
  {
    title: 'Movie Discovery App',
    description:
      'A dark-themed movie browser built on the TMDB API — search, trending titles, and responsive movie cards, with DNS-level troubleshooting to work around regional ISP blocking.',
    tech: ['React', 'TMDB API', 'CSS Grid'],
    features: [
      'Live search with debounced queries',
      'Trending & responsive movie cards',
      'Dark theme throughout',
    ],
    accent: '',
    image: movieImg,
    liveUrl: 'https://movie-website-xxd.pages.dev',
    githubUrl: 'https://github.com/kleo2006/movie-website',
  },
];