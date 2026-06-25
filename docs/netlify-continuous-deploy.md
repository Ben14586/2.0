# Netlify Continuous Deploy

Goal: deploy the public site automatically from GitHub so manual ZIP uploads are no longer needed.

## One-Time Netlify Setup

1. Open Netlify site `store-game-0`.
2. Go to `Site configuration` > `Build & deploy`.
3. In `Continuous deployment`, click `Link repository`.
4. Choose GitHub repository `Ben14586/2.0`.
5. Use branch `main`.
6. Build settings:
   - Build command: `npm run export:static`
   - Publish directory: `netlify-deploy`
7. Save and deploy.

The same values are also stored in `netlify.toml`, so Netlify should auto-fill them after the repo is linked.

## Required Environment

The frontend build needs the backend URL at build time:

```text
PUBLIC_API_BASE_URL=https://game-services-hwcy.onrender.com
PUBLIC_SITE_URL=https://game-services-hwcy.onrender.com
ADMIN_SITE_URL=https://game-services-hwcy.onrender.com
ALLOWED_ORIGINS=https://game-services-hwcy.onrender.com
```

These are public routing values, not secrets. They are included in `netlify.toml` for reliable auto deploy.

## Normal Update Flow

After repository linking is done:

1. Update local files.
2. Run QA locally when possible:

```powershell
npm run export:static
npm run qa
```

3. Upload or push changed source files to GitHub.
4. Netlify builds and deploys automatically.

Manual `netlify-deploy-latest.zip` upload is only needed as an emergency fallback.

## Important Notes

- Do not upload `database.db` to GitHub. The public static catalog is generated from backend seed data.
- Do not upload `.env` to GitHub.
- Do not upload screenshots into source file paths such as `Dockerfile`.
- If the backend URL changes, update `PUBLIC_API_BASE_URL` in `netlify.toml` and redeploy.
