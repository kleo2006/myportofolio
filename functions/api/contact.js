// Cloudflare Pages Function — POST /api/contact
//
// Why this exists: the browser used to POST straight to HubSpot's public
// Forms Submission API (api-eu1.hsforms.com/.../submit/...). That endpoint
// is anonymous/unauthenticated by design, so HubSpot runs every request
// through a spam filter that scores requests partly on the sending domain
// ("Unregistered Site Domain" in the Forms > Submissions view). A Cloudflare
// Pages *.pages.dev domain can't be verified in HubSpot (you don't control
// the pages.dev zone), so submissions from it get silently spam-filtered
// even though the request itself succeeds (200 OK).
//
// The fix: submit server-side using an authenticated HubSpot Private App
// token via the CRM API instead of the public Forms API. Authenticated CRM
// calls aren't run through that anonymous-submission spam pipeline at all,
// since HubSpot already knows who's making the request.
//
// Setup required in HubSpot:
//   1. Settings > Integrations > Private Apps > Create a private app
//      Scopes needed: crm.objects.contacts.write, crm.objects.contacts.read
//   2. Settings > Properties > Contact properties > Create property
//      Internal name: message   Label: Message   Field type: Multi-line text
//      (This stores the message text on the contact. If you'd rather not
//      add a custom property, see the NOTE fallback comment below.)
//   3. Settings > Properties > Contact properties > Create property
//      Internal name: newsletter_opt_in   Label: Newsletter opt-in
//      Field type: Single checkbox (boolean)
//      (Stores whether this submission checked "keep me posted." To build
//      an actual send list later: Contacts > Lists > create an
//      active list filtered on newsletter_opt_in = true. This property
//      alone does NOT subscribe anyone through HubSpot's own marketing-
//      email subscription/consent system — for real bulk sends you'd
//      eventually want to also add contacts to a HubSpot subscription
//      type via the Communication Subscriptions API so unsubscribe links
//      and consent tracking work correctly. This simple boolean is enough
//      for a low-volume "let me know when I ship something new" list.)
//
// Setup required in Cloudflare Pages:
//   Settings > Environment variables > Production (and Preview)
//     HUBSPOT_PRIVATE_APP_TOKEN = <the token from step 1>
//     RESEND_API_KEY            = <API key from resend.com>
//     NOTIFY_EMAIL              = <your Gmail address>
//   Redeploy after adding these — Functions read env vars at request time
//   (not build time like Vite's VITE_ vars), so no rebuild is technically
//   required, but Cloudflare needs a fresh deployment to pick them up.
//
// Email notifications (Resend):
//   1. Sign up at resend.com (free tier: 3,000 emails/month)
//   2. Dashboard > API Keys > Create API Key > copy it into RESEND_API_KEY
//   3. For quick setup with no domain verification, sending "from"
//      onboarding@resend.dev works out of the box, but only delivers to
//      the email address you signed up to Resend with. To send to any
//      Gmail address reliably, verify your own domain under Domains in
//      Resend and send "from" an address on that domain instead (e.g.
//      notifications@yourdomain.com) — see RESEND_FROM below.
//   4. Set NOTIFY_EMAIL to the Gmail address you want notified.
//   Email sending failures are logged but never block the actual contact
//   save — HubSpot is the source of truth, email is a best-effort nicety.
//
// Spam protection (SEC-01):
//   A hidden honeypot field ("company") is checked below — real users never
//   see or fill it, so a non-empty value means a bot. That's a code-level
//   fix. Rate limiting is NOT something this file can do on its own; add it
//   at the platform level instead:
//     Cloudflare dashboard > your Pages project > Security > Rate limiting
//     rules > create a rule scoped to /api/contact, e.g. block/challenge
//     after 5 requests per IP per 10 minutes.

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const RESEND_API_BASE = 'https://api.resend.com';
// Change this once you've verified a domain in Resend, e.g.
// 'Portfolio <notifications@yourdomain.com>'
const RESEND_FROM = 'Portfolio <onboarding@resend.dev>';

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const name = (payload?.name || '').trim();
  const email = (payload?.email || '').trim();
  const message = (payload?.message || '').trim();
  const newsletterOptIn = payload?.newsletter === true;
  const honeypot = (payload?.company || '').trim();

  // Honeypot check: this field is hidden from real users via CSS/aria, so
  // anything filling it in is almost certainly a bot. Return 200 with a
  // fake success rather than a 4xx — telling a bot "rejected" just teaches
  // it to leave the honeypot blank next time.
  if (honeypot) {
    console.warn('[api/contact] Honeypot triggered — dropping submission silently.');
    return jsonResponse({ ok: true }, 200);
  }

  if (!name || !email || !message) {
    return jsonResponse({ error: 'name, email, and message are all required' }, 400);
  }
  if (!isValidEmail(email)) {
    return jsonResponse({ error: 'Invalid email address' }, 400);
  }

  const token = env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    console.error('[api/contact] Missing HUBSPOT_PRIVATE_APP_TOKEN env var');
    return jsonResponse({ error: 'Server is not configured for form submissions' }, 500);
  }

  try {
    // Upsert the contact by email — creates it if new, updates it if it
    // already exists. This is the batch/upsert endpoint specifically
    // because the single-object PATCH-by-idProperty endpoint only updates
    // existing contacts and 404s on new ones.
    const upsertResponse = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/batch/upsert`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [
            {
              idProperty: 'email',
              id: email,
              properties: {
                email,
                firstname: name,
                message,
                newsletter_opt_in: newsletterOptIn,
              },
            },
          ],
        }),
      }
    );

    const upsertBody = await upsertResponse.json().catch(() => null);

    if (!upsertResponse.ok) {
      console.error('[api/contact] HubSpot upsert failed:', upsertResponse.status, upsertBody);

      // HubSpot's error envelope is: { status, message, correlationId, category, ... }
      // and for invalid/missing properties, category is 'VALIDATION_ERROR' with the
      // real reason in `message` (e.g. `Property "newsletter_opt_in" does not exist`).
      // Surface that real reason instead of guessing — the previous version checked
      // for the literal string "message" in the response body, which is useless
      // since that word is the name of the JSON field itself on every HubSpot error,
      // so it matched (and returned the wrong explanation) on every single failure.
      const hubspotMessage = upsertBody?.message || 'No error detail returned by HubSpot.';
      const isValidationError = upsertResponse.status === 400;

      console.error('[api/contact] HubSpot reason:', hubspotMessage);

      return jsonResponse(
        {
          error: isValidationError
            ? `HubSpot rejected the request: ${hubspotMessage}`
            : 'HubSpot submission failed',
        },
        502
      );
    }

    console.log('[api/contact] Contact upserted:', upsertBody?.results?.[0]?.id);

    // Best-effort email notification — never let this fail the request.
    // The contact is already safely saved in HubSpot at this point; a
    // notification hiccup shouldn't turn into a user-facing error.
    await sendNotificationEmail({ env, name, email, message });

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error('[api/contact] Unexpected error:', error);
    return jsonResponse({ error: 'Unexpected server error' }, 500);
  }
}

async function sendNotificationEmail({ env, name, email, message }) {
  const apiKey = env.RESEND_API_KEY;
  const notifyEmail = env.NOTIFY_EMAIL;

  if (!apiKey || !notifyEmail) {
    console.warn(
      '[api/contact] Skipping email notification — RESEND_API_KEY or NOTIFY_EMAIL not set'
    );
    return;
  }

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [notifyEmail],
        reply_to: email,
        subject: `New portfolio message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Message:</strong></p>
<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      console.error('[api/contact] Resend notification failed:', response.status, body);
    }
  } catch (error) {
    console.error('[api/contact] Resend notification threw:', error);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Reject non-POST methods explicitly so you get a clean 405 instead of a
// generic 404 if something calls this with the wrong method.
export async function onRequestGet() {
  return jsonResponse({ error: 'Method not allowed, use POST' }, 405);
}