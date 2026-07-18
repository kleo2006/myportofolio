import { memo } from 'react';
import { SITE_CONFIG } from '../../data/siteConfig';
import { FOCUS_AREAS } from '../../data/focusAreas';
import './Hero.css';

function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero__backdrop" aria-hidden="true">
        <div className="hero__grid" />
        <div className="hero__glow" />
      </div>

      <div className="hero__inner container">
        <div className="hero__content">
          <span className="hero__eyebrow">
            <span className="hero__pulse" aria-hidden="true" />
            {SITE_CONFIG.availability}
          </span>

          <h1 className="hero__name">{SITE_CONFIG.name}</h1>

          <p className="hero__role">
            Frontend &amp; <span className="hero__role-accent">Full-Stack</span>{' '}
            Developer
          </p>

          <p className="hero__description">
            I create modern web experiences that are fast, intuitive, and crafted with precision. From pixel-perfect interfaces to scalable frontend architecture, I build digital products that elevate brands, solve real problems, and leave lasting impressions.
          </p>

          <div className="hero__actions">
            <a href="#projects" className="hero__btn hero__btn--primary">
              View projects
            </a>
            <a
              href={SITE_CONFIG.resumeUrl}
              className="hero__btn hero__btn--ghost"
              download
            >
              Download CV
            </a>
          </div>

          <ul className="hero__stack" aria-label="Primary technologies">
            {SITE_CONFIG.stack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </div>

        <aside className="hero__panel" aria-label="What I specialize in">
          <div className="hero__panel-head">
            <span>WHAT I SPECIALIZE IN</span>
          </div>

          <ul className="hero__panel-list">
            {FOCUS_AREAS.map((area) => (
              <li className="hero__panel-item" key={area.label}>
                <span
                  className="hero__panel-dot"
                  style={{ background: area.color }}
                  aria-hidden="true"
                />
                <div>
                  <p className="hero__panel-label">{area.label}</p>
                  <p className="hero__panel-description">{area.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <a href="#about" className="hero__scroll-cue">
        <span>Scroll</span>
        <span className="hero__scroll-line" aria-hidden="true" />
      </a>
    </section>
  );
}

export default memo(Hero);