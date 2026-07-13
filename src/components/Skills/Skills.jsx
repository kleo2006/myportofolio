import { memo } from 'react';
import { SKILL_CATEGORIES } from '../../data/skills';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import CategoryIcon from '../UI/CategoryIcon/CategoryIcon';
import './Skills.css';

function SkillCard({ category, index }) {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`skill-card reveal ${isVisible ? 'reveal--visible' : ''}`}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <div className="skill-card__icon">
        <CategoryIcon name={category.icon} />
      </div>
      <h3 className="skill-card__title">{category.title}</h3>

      <ul className="skill-card__list">
        {category.skills.map((skill) => (
          <li key={skill.name} className="skill-card__row">
            <span className="skill-card__name">{skill.name}</span>
            <span
              className="skill-card__level"
              aria-label={`Proficiency: ${skill.level} of 3`}
            >
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`skill-card__dot ${
                    dot <= skill.level ? 'skill-card__dot--filled' : ''
                  }`}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Skills() {
  return (
    <section id="skills" className="skills section">
      <div className="container">
        <div className="section__head">
          <span className="section__eyebrow">Skills</span>
          <h2 className="section__title">Tools I reach for daily</h2>
          <p className="section__description">
            Not an exhaustive list — the stack I actually use to take a
            project from a blank repo to something deployed and working.
          </p>
        </div>

        <div className="skills__grid">
          {SKILL_CATEGORIES.map((category, index) => (
            <SkillCard key={category.title} category={category} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(Skills);