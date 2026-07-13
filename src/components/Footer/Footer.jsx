import { memo } from 'react';
import { NAV_LINKS } from '../../data/navLinks';
import { SITE_CONFIG } from '../../data/siteConfig';
import { SOCIAL_LINKS } from '../../data/socials';
import SocialIcon from '../UI/SocialIcon/SocialIcon';
import './Footer.css';

function Footer() {
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="container footer__top">
        <div className="footer__brand">
          <span className="footer__logo">{SITE_CONFIG.initials}</span>
          <p className="footer__tagline">
            Building fast, considered interfaces — and the systems behind
            them.
          </p>
        </div>

        <nav className="footer__nav" aria-label="Footer">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__socials-block">
          <ul className="footer__socials">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  aria-label={social.label}
                  target={social.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={social.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                >
                  <SocialIcon name={social.icon} />
                </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="footer__top-btn"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <SocialIcon name="arrowUp" />
          </button>
        </div>
      </div>

      <div className="container footer__bottom">
        <p>
          © {year} {SITE_CONFIG.name}. All rights reserved.
        </p>
        <p className="footer__built-with">Built with React &amp; Vite</p>
      </div>
    </footer>
  );
}

export default memo(Footer);