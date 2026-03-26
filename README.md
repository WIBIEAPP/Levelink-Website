# Levelink-Website

Promotional/coming-soon site for [www.levelink.be](https://www.levelink.be), hosted on GitHub Pages.

## Stack

| Layer | Tool |
|---|---|
| Hosting | GitHub Pages (static) |
| Analytics | Cloudflare Web Analytics |
| Newsletter | Brevo (double opt-in via Cloudflare Worker proxy) |

## Cloudflare Worker — newsletter subscribe proxy

The Worker lives in `worker/subscribe.js` and proxies form submissions from the site to Brevo's double opt-in API, keeping the API key off the frontend.

### First-time setup

```bash
npm install -g wrangler
npx wrangler login
```

### Deploy

```bash
cd worker
npx wrangler deploy          # uses wrangler.toml
```

The `BREVO_API_KEY` secret must be set once manually (it is not in `wrangler.toml`):

```bash
npx wrangler secret put BREVO_API_KEY --name levelink-subscribe
```

### Test with curl

```bash
curl -s -X POST https://levelink-subscribe.thomas-biesmans.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.levelink.be" \
  -d '{"email":"you@example.com","firstname":"Jan","lastname":"Janssen"}'
# Expected: {"ok":true}
# Brevo then sends a double opt-in confirmation email to the address.
```

### Environment variables (`wrangler.toml`)

| Variable | Type | Value |
|---|---|---|
| `ALLOWED_ORIGIN` | Plaintext | `https://www.levelink.be` |
| `BREVO_LIST_ID` | Plaintext | numeric list ID in Brevo |
| `BREVO_DOI_TEMPLATE_ID` | Plaintext | numeric template ID in Brevo |
| `BREVO_API_KEY` | **Secret** | set via `wrangler secret put` |