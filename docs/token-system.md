# Token System

## Scope

This project uses three token/secret groups:

- Admin login session token
- Optional emergency `ADMIN_KEY`
- External deploy/provider tokens such as Netlify, Render, Railway, or GitHub tokens

## Admin Session Tokens

- Admin login returns a one-time raw bearer token to the browser.
- The backend stores only a SHA-256 session hash in SQLite using the `session_sha256$...` prefix.
- Existing legacy raw tokens are still accepted until they expire, so upgrades do not force a lockout.
- Logout revokes the active token in the database and clears the admin cookie.
- Expired tokens are cleared when they are presented.

## Admin Key

- `ADMIN_KEY` is an optional emergency API key.
- Keep it blank in production unless you need emergency API access.
- If enabled, store it only in `.env` or backend host environment variables.
- Never paste it into public files, docs, screenshots, or frontend code.

## Local Secret Setup

Check token readiness:

```powershell
npm run tokens:check
```

Fill missing local secrets in `.env`:

```powershell
npm run tokens:setup
```

Rotate local emergency key:

```powershell
python tools/manage_tokens.py --write-env --rotate-admin-key
```

Print generated values only when you are intentionally copying them into a private password manager or backend host secret panel:

```powershell
python tools/manage_tokens.py --write-env --rotate-admin-key --print-values
```

## Backend Host Secrets

For Render/Railway, set secrets in the host dashboard rather than committing them:

```text
ADMIN_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=<strong-private-password>
ADMIN_SESSION_HOURS=8
ADMIN_KEY=<optional-emergency-key>
COOKIE_SECURE=1
COOKIE_SAMESITE=None
```

## Deploy Provider Tokens

Deploy tokens are not project runtime secrets. Use them only in your local shell, CI provider, or host account:

```text
NETLIFY_AUTH_TOKEN=<private>
RENDER_API_KEY=<private>
RAILWAY_TOKEN=<private>
GITHUB_TOKEN=<private>
```

The current workspace should not store these values unless you explicitly choose to add them to your private machine-level environment.
