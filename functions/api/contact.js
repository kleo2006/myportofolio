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
//
// Setup required in Cloudflare Pages:
//   Settings > Environment variables > Production (and Preview)
//     HUBSPOT_PRIVATE_APP_TOKEN = <the token from step 1>
//   Redeploy after adding it — Functions read this at request time (not
//   build time like Vite's VITE_ vars), so this one doesn't need a rebuild,
//   but Cloudflare still needs the deployment to know the var exists.

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

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
              },
            },
          ],
        }),
      }
    );

    const upsertBody = await upsertResponse.json().catch(() => null);

    if (!upsertResponse.ok) {
      console.error('[api/contact] HubSpot upsert failed:', upsertResponse.status, upsertBody);

      // Most likely failure mode: the custom "message" contact property
      // doesn't exist yet in this HubSpot portal. HubSpot returns 400 with
      // a message naming the invalid property in that case.
      const missingProperty =
        upsertResponse.status === 400 &&
        JSON.stringify(upsertBody || {}).toLowerCase().includes('message');

      if (missingProperty) {
        return jsonResponse(
          {
            error:
              'HubSpot rejected the "message" property. Create a contact property with internal name "message" in HubSpot (Settings > Properties > Contact properties), or remove it from this function.',
          },
          502
        );
      }

      return jsonResponse({ error: 'HubSpot submission failed' }, 502);
    }

    console.log('[api/contact] Contact upserted:', upsertBody?.results?.[0]?.id);
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error('[api/contact] Unexpected error:', error);
    return jsonResponse({ error: 'Unexpected server error' }, 500);
  }
}

// Reject non-POST methods explicitly so you get a clean 405 instead of a
// generic 404 if something calls this with the wrong method.
export async function onRequestGet() {
  return jsonResponse({ error: 'Method not allowed, use POST' }, 405);
}