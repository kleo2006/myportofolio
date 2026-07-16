import { memo } from 'react';
import { SITE_CONFIG } from '../../data/siteConfig';
import { CURRENTLY_LEARNING } from '../../data/about';
import { PROJECTS } from '../../data/projects';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import './About.css';

// Computed rather than hardcoded, so this never quietly goes stale as
// projects are added or another year passes.
const CAREER_START_YEAR = 2023;
const yearsBuilding = new Date().getFullYear() - CAREER_START_YEAR;

function About() {
  const [textRef, textVisible] = useScrollReveal();
  const [panelRef, panelVisible] = useScrollReveal({ threshold: 0.2 });

  return (
    <section id="about" className="about section">
      <div className="container about__inner">
        <div
          ref={textRef}
          className={`about__content reveal ${textVisible ? 'reveal--visible' : ''}`}
        >
          <span className="section__eyebrow">About</span>
          <h2 className="section__title">
            I build things for the web, end to end.
          </h2>

          <p className="about__paragraph">
            I&rsquo;m {SITE_CONFIG.name}, a frontend-leaning full-stack
            developer based in {SITE_CONFIG.location}. What pulled me into
            this field wasn&rsquo;t just writing code — it was the moment
            an interface goes from a static idea to something people can
            actually click, scroll, and trust. I still chase that moment
            on every project.
          </p>

          <p className="about__paragraph">
            Day to day that means React on the frontend, Node.js and
            Express behind it, and a habit of caring more than I probably
            need to about load times, layout shifts, and how something
            looks on a five-year-old phone. I run my work through
            NorthWind, an IT services outfit that&rsquo;s let me build
            real products for real clients across Europe and North
            America instead of just portfolio pieces.
          </p>

          <p className="about__paragraph">
            Alongside that I&rsquo;m still a student — computer science,
            telecommunications, database systems — which keeps me honest
            about the fundamentals underneath the frameworks. The goal
            isn&rsquo;t to collect technologies; it&rsquo;s to keep
            shipping products I&rsquo;d be comfortable putting my name on.
          </p>

          <div className="about__learning">
            <span className="about__learning-label">
              Currently studying
            </span>
            <ul className="about__learning-tags">
              {CURRENTLY_LEARNING.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <aside
          ref={panelRef}
          className={`about__panel reveal ${panelVisible ? 'reveal--visible' : ''}`}
          aria-label="Snapshot"
        >
          <div className="about__avatar" aria-hidden="true">
            <span>{SITE_CONFIG.initials}</span>
          </div>

          <dl className="about__stats">
            <div className="about__stat">
              <dt>Projects shipped</dt>
              <dd>{PROJECTS.length}</dd>
            </div>
            <div className="about__stat">
              <dt>Years building</dt>
              <dd>{yearsBuilding}+</dd>
            </div>
            <div className="about__stat">
              <dt>Core technologies</dt>
              <dd>{SITE_CONFIG.stack.length}</dd>
            </div>
            <div className="about__stat about__stat--wide">
              <dt>Client regions</dt>
              <dd className="about__stat-text">Europe &amp; North America</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

export default memo(About);