# Production Backend Plan

## Goal

Run the public storefront on Netlify and run the real order/admin API on a backend host such as Render, Railway, or a VPS.

## Phase 2 Deployment Shape

- Netlify serves `index.html`, styles, static game data, and `runtime-config.js`.
- Online backend serves `/api/*`, `/uploads/*`, `/admin.html` if needed, and `/health`.
- `runtime-config.js` sets `window.API_BASE_URL` so the Netlify site sends orders, slip uploads, coupon checks, and tracking requests to the online backend.
- If the backend is not configured or unavailable, the storefront still falls back to local static order IDs.

## Required Backend Environment

```env
HOST=0.0.0.0
DATABASE_FILE=database.db
UPLOADS_DIR=uploads
ADMIN_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=change-this-before-first-run
ADMIN_SESSION_HOURS=8
COOKIE_SECURE=1
COOKIE_SAMESITE=None
PUBLIC_SITE_URL=https://store-game-0.netlify.app
ADMIN_SITE_URL=https://store-game-0.netlify.app
PUBLIC_API_BASE_URL=https://your-backend-host.example.com
ALLOWED_ORIGINS=https://store-game-0.netlify.app
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
LINE_NOTIFY_TOKEN=
```

## Deploy Steps

1. Deploy `server.py` to the backend host.
2. Set every required environment variable. On Render, keep `DATABASE_FILE=/var/data/database.db` and `UPLOADS_DIR=/var/data/uploads` with a persistent disk mounted at `/var/data`.
3. Open `/health` on the backend URL and confirm it returns success.
4. Configure the Netlify bundle to use that backend:

```bash
npm run configure:backend -- https://your-backend-host.example.com
```

5. Upload `netlify-deploy-latest.zip` to Netlify.
6. Open the Netlify site, place a test order, and confirm the order appears in admin.
7. Open admin, press backend health check, and download one database backup.
8. Run `npm run qa` locally before every upload.
9. Run a smoke test against the online backend:

```bash
npm run smoke -- --base-url https://your-backend-host.example.com
```

Use admin checks only after the backend credentials are configured:

```bash
npm run smoke -- --base-url https://your-backend-host.example.com --admin
```

## Admin Notes

- Admin login returns a session token and the admin page sends it as `Authorization: Bearer ...`.
- Realtime admin events can use the same token for the EventSource connection.
- For cross-domain cookies, production should use `COOKIE_SECURE=1` and `COOKIE_SAMESITE=None`.
- Admin can download a backup zip from `/api/admin-backup`; keep a copy before major edits or campaign launches.

## Next Upgrade

After this phase is stable, connect a real database such as PostgreSQL and move uploaded slips/game images to object storage such as Cloudinary, S3, or Cloudflare R2.
