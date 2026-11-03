import northwindImg from '../assets/images/northwind.png';
import tomatoImg from '../assets/images/tomato1.png';
import movieImg from '../assets/images/cinema1.png';

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
    title: 'Cinema — Film Discovery',
    description:
      'A cinematic film browser built on the TMDB API — a featured hero, trending and top-rated shelves, filterable discovery, search, a personal watchlist and an in-site player. TMDB requests run through a Cloudflare Pages Function, so the API key stays server-side and the site loads on networks that block TMDB.',
    tech: ['React', 'React Router', 'TMDB API', 'Cloudflare Pages Functions', 'hls.js'],
    features: [
      'Debounced search, URL-shareable Discover filters and genre browsing',
      'Watchlist and resume progress saved on-device',
      'Edge proxy with caching keeps the API key private',
    ],
    accent: '',
    image: movieImg,
    liveUrl: 'https://cinema-website.pages.dev',
    githubUrl: 'https://github.com/kleo2006/cinema-website',
  },
];