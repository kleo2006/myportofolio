import { useState } from 'react';
import { SITE_CONFIG } from '../../data/siteConfig';
import { SOCIAL_LINKS } from '../../data/socials';
import { validateContactForm } from '../../utils/validate';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SocialIcon from '../UI/SocialIcon/SocialIcon';
import './Contact.css';

// A hidden field real visitors never see or fill in. Basic form-filling
// bots typically fill every input they find; if this one comes back
// non-empty, we silently drop the submission server-side instead of
// creating a real HubSpot contact / sending a real email for it.
const INITIAL_FORM = { name: '', email: '', message: '', company: '', newsletter: false };

// Submits to our own Cloudflare Pages Function (functions/api/contact.js),
// which authenticates to HubSpot server-side with a Private App token.
//
// We used to POST directly to HubSpot's public Forms Submission API from
// the browser. That endpoint is anonymous by design, so HubSpot spam-filters
// submissions partly based on the sending domain — a *.pages.dev domain
// can't be verified in HubSpot, so every submission from it landed in
// "Spam submissions" as "Unregistered Site Domain", even though the request
// itself returned 200 OK. Routing through our own authenticated backend
// sidesteps that anonymous-submission spam pipeline entirely.
const CONTACT_ENDPOINT = '/api/contact';

function Contact() {
  const [infoRef, infoVisible] = useScrollReveal();
  const [formRef, formVisible] = useScrollReveal({ threshold: 0.2 });

  const [values, setValues] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [subscribedOnSuccess, setSubscribedOnSuccess] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Focus the first invalid field so screen-reader users hear its
      // label/error immediately instead of having to re-navigate the
      // whole form to discover what's wrong.
      const firstErrorField = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorField)?.focus();
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          message: values.message,
          newsletter: values.newsletter,
          company: values.company, // honeypot — must stay empty
        }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        console.error(
          '[Contact] Submission failed.',
          'Status:', response.status,
          'Response:', responseBody
        );
        throw new Error(responseBody?.error || `Submission failed with status ${response.status}`);
      }

      console.log('[Contact] Submission succeeded:', responseBody);
      setSubscribedOnSuccess(values.newsletter);
      setStatus('success');
      setValues(INITIAL_FORM);
    } catch (error) {
      console.error('Contact form submission failed:', error);
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
          {/* Honeypot — real users never see this (aria-hidden + tabIndex
              -1 + visually hidden), so any submission with this filled in
              is almost certainly a bot. Not a name a legit form would use,
              to avoid autofill collisions. */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={values.company}
              onChange={handleChange}
            />
          </div>

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

          <div className="contact__field contact__field--checkbox">
            <input
              id="newsletter"
              name="newsletter"
              type="checkbox"
              checked={values.newsletter}
              onChange={handleChange}
            />
            <label htmlFor="newsletter">
              Keep me posted on new projects and availability
            </label>
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
              (subscribedOnSuccess
                ? 'Thanks — your message is in, and you\u2019re on the list for updates.'
                : 'Thanks — your message is in. I\u2019ll get back to you soon.')}
            {status === 'error' &&
              'Something went wrong sending that. Try the email link instead.'}
          </div>
        </form>
      </div>
    </section>
  );
}

export default Contact;