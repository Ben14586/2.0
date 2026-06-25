# Phase 3 Go-Live Runbook

## Objective

Deploy the backend online, connect the Netlify storefront to that backend, then verify a real customer order reaches the admin panel.

## Current Artifacts

- Backend package: `backend-deploy-latest.zip`
- Netlify package: `netlify-deploy-latest.zip`
- Render blueprint: `render.yaml`
- Railway blueprint: `railway.json`
- Production env template: `production.env.example`

## Local Build Gate

Run this before uploading anything:

```bash
npm run phase3:build
```

This command packages the backend, exports the Netlify zip, runs QA, runs local smoke tests, and prints Phase 3 readiness.

## Option A: Render Backend

1. Create a new Render Web Service.
2. Use this project as the source if you connect Git, or upload the backend package contents.
3. Use:
   - Build command: `pip install -r requirements.txt`
   - Start command: `python server.py`
   - Health check path: `/health`
4. Add persistent disk:
   - Mount path: `/var/data`
   - Size: `1GB` or higher
5. Copy variables from `production.env.example`.
6. Set:
   - `DATABASE_FILE=/var/data/database.db`
   - `UPLOADS_DIR=/var/data/uploads`
   - `PUBLIC_SITE_URL=https://game-services-hwcy.onrender.com`
   - `ADMIN_SITE_URL=https://game-services-hwcy.onrender.com`
   - `ALLOWED_ORIGINS=https://game-services-hwcy.onrender.com`
   - `COOKIE_SECURE=1`
   - `COOKIE_SAMESITE=None`
7. Deploy and wait until `/health` returns success.

## Option B: Railway Backend

1. Create a new Railway project.
2. Deploy this project/package.
3. Set start command to `python server.py` if Railway does not detect it from `railway.json`.
4. Add a persistent volume if available and mount it to `/var/data`.
5. Copy variables from `production.env.example`.
6. Deploy and open `/health`.

## Connect Netlify To Backend

After the backend URL is live, run:

```bash
npm run configure:backend -- https://your-backend-host.example.com
```

Then upload the rebuilt `netlify-deploy-latest.zip` to Netlify.

## Smoke Test Online Backend

```bash
npm run smoke -- --base-url https://your-backend-host.example.com
```

With admin credentials available locally:

```bash
npm run smoke -- --base-url https://your-backend-host.example.com --admin
```

## Real Order Test

1. Open the Netlify storefront.
2. Select a game and package.
3. Upload a test slip image.
4. Confirm order.
5. Confirm the order ID starts with `ORD-`, not `WEB-`.
6. Open admin.
7. Confirm the order appears under recent orders.
8. Change status to `processing`.
9. Search the order ID in the public tracking box.

## Backup Gate

Before announcing the site:

1. Open admin.
2. Press backend health check.
3. Download one database backup.
4. Store it outside the deployment host.

## Go / No-Go

Go live only when:

- `/health` returns success online.
- `npm run smoke -- --base-url <backend>` passes.
- A real order creates `ORD-...`.
- Admin can see and update that order.
- Tracking page can find the order.
- A database backup downloads successfully.
