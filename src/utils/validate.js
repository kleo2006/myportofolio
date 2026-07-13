const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates the contact form fields and returns an error map.
 * An empty object means the form is valid.
 */
export function validateContactForm({ name, email, message }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = 'Please enter your name.';
  }

  if (!email.trim()) {
    errors.email = 'Please enter your email.';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'That email address doesn\u2019t look right.';
  }

  if (!message.trim()) {
    errors.message = 'Add a short message so I know what you need.';
  } else if (message.trim().length < 10) {
    errors.message = 'A few more words would help — what are you looking for?';
  }

  return errors;
}