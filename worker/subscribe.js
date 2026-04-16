// Cloudflare Worker — Brevo double opt-in proxy
// See README.md for deploy instructions and curl test examples.

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
        FIRSTNAME:     (data.firstname   ?? '').trim(),
        LASTNAME:      (data.lastname    ?? '').trim(),
        POSTCODE:      (data.postcode    ?? '').trim().toUpperCase(),
        TYPE_WONING:   (data.type_woning ?? '').trim(),
        INTEREST:      (data.interest    ?? '').trim(),
        EMAIL_UPDATES: data.email_updates === true,
      },
      includeListIds:  [Number(env.BREVO_LIST_ID)],
      templateId:      data.email_updates === true
                         ? Number(env.BREVO_DOI_TEMPLATE_ID)
                         : Number(env.BREVO_DOI_TEMPLATE_ID_NOSUB),
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

    // DOI endpoint returns 204 (existing contact) or 201 (new contact) on success
    if (brevoRes.status === 204 || brevoRes.status === 201) {
      return corsResponse(JSON.stringify({ ok: true }), 200, origin, allowed);
    }

    const errBody = await brevoRes.text();
    console.error('Brevo DOI error', brevoRes.status, errBody);
    let brevoMessage = '';
    try { brevoMessage = JSON.parse(errBody)?.message ?? errBody; } catch { brevoMessage = errBody; }
    return corsResponse(
      JSON.stringify({ error: `Brevo ${brevoRes.status}: ${brevoMessage}` }),
      502, origin, allowed
    );
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
