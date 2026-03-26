/**
 * Cloudflare Worker — Brevo newsletter subscribe proxy
 *
 * Environment variables to set in the Cloudflare dashboard
 * (Workers & Pages → your worker → Settings → Variables & Secrets):
 *
 *   BREVO_API_KEY   your Brevo API key  (secret, encrypted)
 *   BREVO_LIST_ID   numeric list ID from Brevo  (plain text, e.g. "3")
 *   ALLOWED_ORIGIN  your site URL, e.g. "https://www.levelink.be"
 *
 * Deploy:
 *   npm install -g wrangler
 *   npx wrangler login
 *   cd worker
 *   npx wrangler deploy subscribe.js --name levelink-subscribe --compatibility-date 2024-01-01
 */

const BREVO_DOI_URL = 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGIN ?? 'https://www.levelink.be';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse('', 204, origin, allowed);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin, allowed);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400, origin, allowed);
    }

    const email = (data.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return corsResponse(JSON.stringify({ error: 'Invalid email' }), 400, origin, allowed);
    }

    const payload = {
      email,
      attributes: {
        FIRSTNAME: (data.firstname ?? '').trim(),
        LASTNAME:  (data.lastname  ?? '').trim(),
      },
      includeListIds:  [Number(env.BREVO_LIST_ID)],
      templateId:      Number(env.BREVO_DOI_TEMPLATE_ID),
      redirectionUrl:  `${allowed}/?subscribed=1`,
    };

    const brevoRes = await fetch(BREVO_DOI_URL, {
      method: 'POST',
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      env.BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    // DOI endpoint returns 204 on success (confirmation email queued)
    if (brevoRes.status === 204) {
      return corsResponse(JSON.stringify({ ok: true }), 200, origin, allowed);
    }

    const errBody = await brevoRes.text();
    console.error('Brevo DOI error', brevoRes.status, errBody);
    return corsResponse(JSON.stringify({ error: 'Upstream error' }), 502, origin, allowed);
  },
};

function corsResponse(body, status, origin, allowed) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  // Reflect origin only if it matches the allowed domain
  if (origin === allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return new Response(body, { status, headers });
}
