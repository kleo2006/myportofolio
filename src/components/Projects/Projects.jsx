import { memo } from 'react';
import { PROJECTS } from '../../data/projects';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import './Projects.css';

function ProjectCard({ project, index }) {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.15 });

  return (
    <article
      ref={ref}
      className={`project-card reveal ${isVisible ? 'reveal--visible' : ''}`}
      style={{ transitionDelay: `${index * 90}ms` }}
    >
      <div className={`project-card__thumb project-card__thumb--${project.accent}`}>
        {project.image ? (
          <img
            src={project.image}
            alt={`${project.title} preview`}
            className="project-card__thumb-img"
            loading="lazy"
          />
        ) : (
          <span className="project-card__thumb-mark">{project.title.charAt(0)}</span>
        )}
      </div>

      <div className="project-card__body">
        <h3 className="project-card__title">{project.title}</h3>
        <p className="project-card__description">{project.description}</p>

        <ul className="project-card__features">
          {project.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>

        <ul className="project-card__tech" aria-label="Technologies used">
          {project.tech.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>

        <div className="project-card__actions">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              className="project-card__btn project-card__btn--primary"
              target="_blank"
              rel="noreferrer"
            >
              Live demo
            </a>
          )}
          <a
            href={project.githubUrl}
            className="project-card__btn project-card__btn--ghost"
            target="_blank"
            rel="noreferrer"
          >
            View code
          </a>
        </div>
      </div>
    </article>
  );
}

function Projects() {
  return (
    <section id="projects" className="projects section">
      <div className="container">
        <div className="section__head">
          <span className="section__eyebrow">Projects</span>
          <h2 className="section__title">Things I&rsquo;ve shipped</h2>
          <p className="section__description">
            A mix of client work and self-directed builds — each one taken
            from a blank repo through to a live, deployed product.
          </p>
        </div>

        <div className="projects__grid">
          {PROJECTS.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(Projects);