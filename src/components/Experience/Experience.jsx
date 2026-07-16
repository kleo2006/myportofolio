import { memo } from 'react';
import { EXPERIENCE } from '../../data/experience';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import GithubActivity from '../GithubActivity/GithubActivity';
import './Experience.css';

function TimelineItem({ entry, index, isLast }) {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.3 });

  return (
    <li
      ref={ref}
      className={`timeline-item reveal ${isVisible ? 'reveal--visible' : ''}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="timeline-item__rail">
        <span
          className={`timeline-item__dot ${
            entry.current ? 'timeline-item__dot--current' : ''
          }`}
        />
        {!isLast && <span className="timeline-item__line" />}
      </div>

      <div className="timeline-item__content">
        <span className="timeline-item__period">{entry.period}</span>
        <h3 className="timeline-item__role">{entry.role}</h3>
        <span className="timeline-item__org">{entry.org}</span>
        <p className="timeline-item__description">{entry.description}</p>
      </div>
    </li>
  );
}

function Experience() {
  return (
    <section id="experience" className="experience section">
      <div className="container">
        <div className="section__head">
          <span className="section__eyebrow">Experience</span>
          <h2 className="section__title">Where the time&rsquo;s gone</h2>
          <p className="section__description">
            Freelance work, a company I run, and the coursework running
            alongside both of them.
          </p>
        </div>

        <div className="experience__inner">
          <ol className="timeline">
            {EXPERIENCE.map((entry, index) => (
              <TimelineItem
                key={entry.role}
                entry={entry}
                index={index}
                isLast={index === EXPERIENCE.length - 1}
              />
            ))}
          </ol>

          <GithubActivity />
        </div>

        <div className="experience__cta-row">
          <a href="#contact" className="experience__cta">
            Start a project
          </a>
        </div>
      </div>
    </section>
  );
}

export default memo(Experience);