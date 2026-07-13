import { useState } from 'react';
import { SITE_CONFIG } from '../../data/siteConfig';
import { SOCIAL_LINKS } from '../../data/socials';
import { validateContactForm } from '../../utils/validate';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SocialIcon from '../UI/SocialIcon/SocialIcon';
import './Contact.css';

const INITIAL_FORM = { name: '', email: '', message: '' };

// From your HubSpot account: Settings > Marketing > Forms > (your form) > Embed code,
// or the form's URL when editing it. Portal ID is your HubSpot account/hub ID.
const HUBSPOT_PORTAL_ID = import.meta.env.VITE_HUBSPOT_PORTAL_ID;
const HUBSPOT_FORM_ID = import.meta.env.VITE_HUBSPOT_FORM_ID;
const HUBSPOT_ENDPOINT = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;

function Contact() {
  const [infoRef, infoVisible] = useScrollReveal();
  const [formRef, formVisible] = useScrollReveal({ threshold: 0.2 });

  const [values, setValues] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus('submitting');

    try {
      const response = await fetch(HUBSPOT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: [
            { name: 'firstname', value: values.name },
            { name: 'email', value: values.email },
            { name: 'message', value: values.message },
          ],
          context: {
            pageUri: window.location.href,
            pageName: document.title,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'HubSpot submission failed');
      }

      setStatus('success');
      setValues(INITIAL_FORM);
    } catch (error) {
      console.error('HubSpot form submission failed:', error);
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="contact section">
      <div className="container contact__inner">
        <div
          ref={infoRef}
          className={`contact__info reveal ${infoVisible ? 'reveal--visible' : ''}`}
        >
          <span className="section__eyebrow">Contact</span>
          <h2 className="section__title">Let&rsquo;s build something</h2>
          <p className="contact__description">
            Have a project in mind, or just want to talk through an idea?
            I usually reply within a day or two.
          </p>

          <a href={`mailto:${SITE_CONFIG.email}`} className="contact__email">
            {SITE_CONFIG.email}
          </a>

          <a
            href={SITE_CONFIG.resumeUrl}
            className="contact__resume"
            download
          >
            Download CV
          </a>

          <ul className="contact__socials">
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
        </div>

        <form
          ref={formRef}
          className={`contact__form reveal ${formVisible ? 'reveal--visible' : ''}`}
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="contact__field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={values.name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <span id="name-error" className="contact__error" role="alert">
                {errors.name}
              </span>
            )}
          </div>

          <div className="contact__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span id="email-error" className="contact__error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="contact__field">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows={5}
              value={values.message}
              onChange={handleChange}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? 'message-error' : undefined}
            />
            {errors.message && (
              <span id="message-error" className="contact__error" role="alert">
                {errors.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="contact__submit"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Sending…' : 'Send message'}
          </button>

          <div aria-live="polite" className="contact__status">
            {status === 'success' &&
              'Thanks — your message is in. I\u2019ll get back to you soon.'}
            {status === 'error' &&
              'Something went wrong sending that. Try the email link instead.'}
          </div>
        </form>
      </div>
    </section>
  );
}

export default Contact;