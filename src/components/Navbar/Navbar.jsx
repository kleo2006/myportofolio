import { useEffect, useState, memo } from 'react';
import { NAV_LINKS } from '../../data/navLinks';
import { SITE_CONFIG } from '../../data/siteConfig';
import { useScrollPosition } from '../../hooks/useScrollPosition';
import { useActiveSection } from '../../hooks/useActiveSection';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../UI/ThemeToggle/ThemeToggle';
import './Navbar.css';

function Navbar() {
  const { isScrolled } = useScrollPosition(24);
  const activeId = useActiveSection(NAV_LINKS.map((link) => link.href));
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close the mobile menu automatically if the viewport grows past mobile.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 720px)');
    const handleChange = (e) => e.matches && setIsMenuOpen(false);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const handleLinkClick = () => setIsMenuOpen(false);

  return (
    <header className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
      <nav className="navbar__inner container" aria-label="Primary">
        <a href="#top" className="navbar__logo" aria-label="Kleo Fili, back to top">
          <span className="navbar__logo-mark">{SITE_CONFIG.initials}</span>
          <span className="navbar__logo-dot" aria-hidden="true" />
        </a>

        <ul className="navbar__links">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`navbar__link ${
                  activeId === link.href ? 'navbar__link--active' : ''
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="navbar__actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <a href="#contact" className="navbar__cta">
            Let&rsquo;s talk
          </a>
        </div>

        <button
          type="button"
          className={`navbar__toggle ${isMenuOpen ? 'navbar__toggle--open' : ''}`}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div
        id="mobile-menu"
        className={`navbar__mobile-menu ${
          isMenuOpen ? 'navbar__mobile-menu--open' : ''
        }`}
      >
        <ul>
          {NAV_LINKS.map((link, index) => (
            <li
              key={link.href}
              style={{ transitionDelay: `${isMenuOpen ? index * 40 : 0}ms` }}
            >
              <a href={link.href} onClick={handleLinkClick}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="navbar__mobile-footer">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <a
            href="#contact"
            className="navbar__mobile-cta"
            onClick={handleLinkClick}
          >
            Let&rsquo;s talk
          </a>
        </div>
      </div>
    </header>
  );
}

// Navbar has no props and rarely needs to re-render from a parent —
// memo keeps it from re-rendering when App re-renders for unrelated reasons.
export default memo(Navbar);