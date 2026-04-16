# Levelink Website — Copilot Instructions

This is the promotional / coming-soon site for **www.levelink.be**, served via **GitHub Pages** (static HTML, no build step).

---

## Project structure

```
index.html          — Main landing page (hero, newsletter form, nav buttons)
contact.html        — Contact info page (name, email, phone, LinkedIn)
CNAME               — Custom domain: www.levelink.be
worker/
  subscribe.js      — Cloudflare Worker: Brevo DOI proxy
  wrangler.toml     — Wrangler deploy config (plaintext vars; secret excluded)
  .wrangler/        — gitignored local build cache
```

All pages are vanilla HTML/CSS/JS — no frameworks, no bundler.

---

## Hosting

- **Platform**: GitHub Pages, branch `main`
- **Domain**: `www.levelink.be` (CNAME file points to `thomas-biesmans.github.io`)
- Pushing to `main` deploys instantly; no CI/CD needed.

---

## Analytics

- **Cloudflare Web Analytics** — cookie-free, no GDPR consent banner required.
- Beacon token: `989210403967440089fe0c146407963b`
- Script tag (present in every HTML page's `<body>`):
  ```html
  <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
    data-cf-beacon='{"token": "989210403967440089fe0c146407963b"}'></script>
  ```
- Do **not** replace this with Google Analytics or any cookie-based tracker without explicit request.

---

## Newsletter — Brevo + Cloudflare Worker (double opt-in)

### Overview

The newsletter form in `index.html` POSTs JSON to a **Cloudflare Worker** (`levelink-subscribe`).  
The Worker holds the Brevo API key as an encrypted secret, so it never touches the frontend.  
Brevo then sends a **double opt-in (DOI) confirmation email** before adding the contact to the list.

```
Browser → POST JSON → Cloudflare Worker → Brevo DOI API → confirmation email
                       (levelink-subscribe)
```

### Brevo account facts

| Item | Value |
|---|---|
| Consumer mailing list ID | `3` |
| Installer / B2B list ID | `4` |
| DOI email template ID | `5` |
| DOI API endpoint | `POST https://api.brevo.com/v3/contacts/doubleOptinConfirmation` |
| Installer contact endpoint | `POST https://api.brevo.com/v3/contacts` (no DOI) |
| Language | Dutch (NL) |

> After subscribing, Brevo returns HTTP 204 (no body) on success. The Worker translates this to `{"ok":true}`.  
> If the contact already exists and has confirmed, Brevo still returns 204 (idempotent).

### Cloudflare Worker

- **Worker name**: `levelink-subscribe`
- **Deploy URL**: `https://levelink-subscribe.thomas-biesmans.workers.dev`
- **Account**: Cloudflare account belonging to `thomas-biesmans`
- **Source**: `worker/subscribe.js`
- **Config**: `worker/wrangler.toml`

#### Environment variables

| Variable | Type | Value |
|---|---|---|
| `ALLOWED_ORIGIN` | Plaintext (wrangler.toml) | `https://www.levelink.be` |
| `BREVO_LIST_ID` | Plaintext (wrangler.toml) | `3` — consumer pre-order list |
| `BREVO_DOI_TEMPLATE_ID` | Plaintext (wrangler.toml) | `5` — used when `email_updates` is **checked** |
| `BREVO_DOI_TEMPLATE_ID_NOSUB` | Plaintext (wrangler.toml) | `6` — used when `email_updates` is **unchecked** |
| `BREVO_INSTALLER_LIST_ID` | Plaintext (wrangler.toml) | `4` — installer / B2B leads list |
| `BREVO_API_KEY` | **Encrypted secret** | set via `wrangler secret put`, never in toml or code |

`wrangler.toml` is intentionally committed to git. `BREVO_API_KEY` is intentionally excluded.

#### Deploy commands

```bash
cd worker
npm install -g wrangler   # first time only
npx wrangler login        # first time only
npx wrangler deploy       # reads wrangler.toml automatically

# Set the API key secret once (not on every deploy):
npx wrangler secret put BREVO_API_KEY --name levelink-subscribe
```

> **Important**: always deploy from `worker/` and let `wrangler.toml` carry the vars.  
> Running `npx wrangler deploy` with inline `--var` flags on the CLI overwrites/strips dashboard vars — use the toml instead.

#### Test with curl

```bash
curl -s -X POST https://levelink-subscribe.thomas-biesmans.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.levelink.be" \
  -d '{"email":"you@example.com","firstname":"Jan","lastname":"Janssen"}'
# Expected response: {"ok":true}
# Brevo sends a DOI confirmation email to the address.
```

### Frontend form (`index.html`)

- The form is **hidden by default** and toggled by the "🏠 Pre-order voor thuis" button (`#newsletter-btn`).
- The toggle adds/removes the `.open` class on `#signup-wrapper` (CSS `max-height` animation).
- Visiting `https://www.levelink.be/#nieuwsbrief` auto-opens the form (for QR codes, links, etc.).
- **Form fields**:
  - `firstname`, `lastname` — optional text
  - `email` — required
  - `postcode` — required, alphanumeric, sent uppercased
  - `type_woning` — optional select: `Appartement (gelijkvloers)`, `Appartement (blok)`, `Woning`, `Anders`
  - `interest` — radio (one of): `Ik heb een regenwaterput`, `Ik ga er een installeren`, `Ik verken opties`
  - `email_updates` — checkbox boolean
- On success: shows Dutch confirmation message — "Bedankt! Check je inbox voor een bevestigingsmail."
- Submit button label: "✅ Ja, zet mij op de pre-orderlijst"
- `WORKER_URL` is set as a JS constant near the top of the inline `<script>` in `index.html`.

### Brevo contact attributes sent by Worker

| Attribute | Type | Source field |
|---|---|---|
| `FIRSTNAME` | text | `firstname` |
| `LASTNAME` | text | `lastname` |
| `POSTCODE` | text | `postcode` (uppercased) |
| `TYPE_WONING` | text | `type_woning` |
| `INTEREST` | text | `interest` |
| `EMAIL_UPDATES` | boolean | `email_updates` |

> These custom attributes must exist in the Brevo account before they can be stored. Create them under **Contacts → Settings → Contact attributes** in Brevo.

### CORS

The Worker only accepts requests from `ALLOWED_ORIGIN` (`https://www.levelink.be`).  
Local dev (e.g. `file://`) will be rejected. Use `localhost` with a local server or temporarily relax `ALLOWED_ORIGIN` for testing.

---

## Known TODOs / open issues

- `contact.html` OG meta tags (`og:url`, `og:image`) still contain placeholder `https://jouwdomein.be/...` URLs — should be updated to `https://www.levelink.be/...`.

---

## Conventions

- All copy is in **Dutch (NL)**.
- No frameworks, no npm dependencies in the site itself (only in `worker/` for Wrangler).
- Keep pages lightweight and fast — no heavy third-party scripts.
- Privacy-first: no cookies, no tracking beyond Cloudflare Web Analytics.

## Git workflow

- **Always work on a feature branch** — never commit directly to `main`.
- Branch naming: `feature/<short-description>` (e.g. `feature/postcode-field`).
- Open a **Pull Request** from the feature branch into `main` when the work is ready.
- Use the GitHub CLI: `gh pr create --base main --head <branch> --title "..." --body "..."`
- `main` is the GitHub Pages deploy branch — merging a PR deploys immediately.
