# Levelink-Website

Promotional/coming-soon site for [www.levelink.be](https://www.levelink.be), hosted on GitHub Pages.

## Stack

| Layer | Tool |
|---|---|
| Hosting | GitHub Pages (static) |
| Analytics | Cloudflare Web Analytics |
| Consumer newsletter | Brevo list 3 (double opt-in via Cloudflare Worker) |
| Installer leads | Brevo list 4 (direct contact via Cloudflare Worker) |

## Cloudflare Worker — subscribe proxy

The Worker lives in `worker/subscribe.js` and routes form submissions to the appropriate Brevo API, keeping the API key off the frontend.

| Route | Form | Brevo flow |
|---|---|---|
| `POST /` | Consumer (home owner) pre-order | Double opt-in — list 3, templates 5/6 |
| `POST /installer` | Installer (B2B) lead | Direct contact create/update — list 4 |

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

### Environment variables (`wrangler.toml`)

| Variable | Type | Value |
|---|---|---|
| `ALLOWED_ORIGIN` | Plaintext | `https://www.levelink.be` |
| `BREVO_LIST_ID` | Plaintext | `3` — consumer pre-order list |
| `BREVO_DOI_TEMPLATE_ID` | Plaintext | `5` — DOI email when `email_updates` is checked |
| `BREVO_DOI_TEMPLATE_ID_NOSUB` | Plaintext | `6` — DOI email when `email_updates` is unchecked |
| `BREVO_INSTALLER_LIST_ID` | Plaintext | `4` — installer / B2B leads list |
| `BREVO_API_KEY` | **Secret** | set via `wrangler secret put` |

### Test with curl

**Consumer form** (`POST /`):
```bash
curl -s -X POST https://levelink-subscribe.thomas-biesmans.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.levelink.be" \
  -d '{"email":"you@example.com","firstname":"Jan","lastname":"Janssen","postcode":"2000","email_updates":true}'
# Expected: {"ok":true}
# Brevo sends a double opt-in confirmation email to the address.
```

**Installer form** (`POST /installer`):
```bash
curl -s -X POST https://levelink-subscribe.thomas-biesmans.workers.dev/installer \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.levelink.be" \
  -d '{"email":"info@bedrijf.be","contactpersoon":"Jan Janssen","bedrijfsnaam":"Loodgieters BVBA","regio":"Antwerpen","preorders":5,"installaties_per_jaar":20}'
# Expected: {"ok":true}
# Contact stored directly in Brevo installer list (no confirmation email).
```