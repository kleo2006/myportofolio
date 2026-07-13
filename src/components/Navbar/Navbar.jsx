import { useEffect, useRef, useState, memo } from 'react';
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
  const scrollYRef = useRef(0);

  // Lock body scroll while the mobile menu is open.
  // Plain `overflow: hidden` on body is unreliable on iOS Safari (it still
  // allows rubber-band scrolling behind fixed elements), so we additionally
  // pin the body in place with `position: fixed` and restore the exact
  // scroll offset when the menu closes.
  useEffect(() => {
    if (isMenuOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
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

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleKey = (e) => e.key === 'Escape' && setIsMenuOpen(false);
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

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

      {/* Dimmed backdrop over the remaining page — tapping it closes the panel */}
      <div
        className={`navbar__backdrop ${isMenuOpen ? 'navbar__backdrop--visible' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <div
        id="mobile-menu"
        className={`navbar__mobile-menu ${
          isMenuOpen ? 'navbar__mobile-menu--open' : ''
        }`}
      >
        <div className="navbar__mobile-logo">
          <span className="navbar__mobile-logo-mark">{SITE_CONFIG.initials}</span>
          <span className="navbar__mobile-logo-text">
            Kleo<span>Fili</span>
          </span>
        </div>

        <ul>
          {NAV_LINKS.map((link, index) => (
            <li
              key={link.href}
              style={{ transitionDelay: `${isMenuOpen ? index * 40 : 0}ms` }}
            >
              <a
                href={link.href}
                onClick={closeMenu}
                className={activeId === link.href ? 'is-active' : ''}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a href="#contact" className="navbar__mobile-cta" onClick={closeMenu}>
          Let&rsquo;s talk
        </a>

        <div className="navbar__mobile-footer">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
    </header>
  );
}

// Navbar has no props and rarely needs to re-render from a parent —
// memo keeps it from re-rendering when App re-renders for unrelated reasons.
export default memo(Navbar);