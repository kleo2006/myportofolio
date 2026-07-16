import { memo, useState } from 'react';
import { FAQ_ITEMS } from '../../data/faq';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import './FAQ.css';

function Chevron({ open }) {
  return (
    <svg
      className={`faq__chevron ${open ? 'faq__chevron--open' : ''}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FAQItem({ item, index, isOpen, onToggle }) {
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;

  return (
    <li className="faq__item">
      <h3 className="faq__item-heading">
        <button
          id={buttonId}
          className="faq__question"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(index)}
        >
          <span className="faq__dot" aria-hidden="true" />
          <span className="faq__question-text">{item.question}</span>
          <Chevron open={isOpen} />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="faq__answer-wrap"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="faq__answer-inner">
          <p className="faq__answer">{item.answer}</p>
        </div>
      </div>
    </li>
  );
}

function FAQ() {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.15 });
  const [openIndex, setOpenIndex] = useState(0);

  const handleToggle = (index) => {
    setOpenIndex((current) => (current === index ? -1 : index));
  };

  return (
    <section id="faq" className="faq section">
      <div className="container">
        <div
          ref={ref}
          className={`faq__panel reveal ${isVisible ? 'reveal--visible' : ''}`}
        >
          <div className="faq__head">
            <span className="faq__eyebrow">
              <span className="faq__eyebrow-pulse" aria-hidden="true" />
              Working together
            </span>
            <h2 className="faq__title">Before you reach out</h2>
            <p className="faq__description">
              The questions clients usually ask before we start — process,
              contracts, and what happens after launch.
            </p>
          </div>

          <ul className="faq__list">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem
                key={item.question}
                item={item}
                index={index}
                isOpen={openIndex === index}
                onToggle={handleToggle}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default memo(FAQ);