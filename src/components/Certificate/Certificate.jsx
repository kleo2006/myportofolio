import { memo } from 'react';
import { CERTIFICATION } from '../../data/certification';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import './Certificate.css';

function VerifiedBadge() {
  return (
    <svg
      className="certificate__badge-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Certificate() {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.15 });

  return (
    <section id="certificate" className="certificate section">
      <div className="container">
        <div
          ref={ref}
          className={`certificate__panel reveal ${isVisible ? 'reveal--visible' : ''}`}
        >
          <div className="certificate__media">
            <img
              src={CERTIFICATION.image}
              alt={`${CERTIFICATION.title} certificate from ${CERTIFICATION.issuer}`}
              className="certificate__image"
              loading="lazy"
            />
            <span className="certificate__verified">
              <VerifiedBadge />
              Verified
            </span>
          </div>

          <div className="certificate__body">
            <span className="certificate__eyebrow">Certification</span>
            <h2 className="certificate__title">{CERTIFICATION.title}</h2>

            <dl className="certificate__meta">
              <div className="certificate__meta-row">
                <dt>Issuer</dt>
                <dd>{CERTIFICATION.issuer}</dd>
              </div>
              <div className="certificate__meta-row">
                <dt>Date</dt>
                <dd>{CERTIFICATION.date}</dd>
              </div>
              <div className="certificate__meta-row">
                <dt>Length</dt>
                <dd>{CERTIFICATION.length}</dd>
              </div>
            </dl>

            <p className="certificate__description">{CERTIFICATION.description}</p>

            <p className="certificate__credential-id">
              Credential ID <span>{CERTIFICATION.credentialId}</span>
            </p>

            <div className="certificate__actions">
              <a
                href={CERTIFICATION.pdfUrl}
                className="certificate__btn certificate__btn--primary"
                download
              >
                <DownloadIcon />
                Download PDF
              </a>
              <a
                href={CERTIFICATION.credentialUrl}
                className="certificate__btn certificate__btn--ghost"
                target="_blank"
                rel="noreferrer"
              >
                Verify on Udemy
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(Certificate);