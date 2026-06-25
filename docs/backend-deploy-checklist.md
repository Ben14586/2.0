# Backend Deploy Checklist

## Goal

Deploy `backend-deploy-latest.zip` to a real backend host so the Netlify storefront can create durable online orders with `ORD-...` IDs.

## Recommended Host

Use Render first because this project already has:

- `render.yaml`
- persistent disk config
- health check path `/health`
- start command `python server.py`

Railway is also supported with `railway.json`.

## Required Environment Variables

Set these on the backend host:

```text
HOST=0.0.0.0
DATABASE_FILE=/var/data/database.db
UPLOADS_DIR=/var/data/uploads
ADMIN_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=<strong-password>
ADMIN_SESSION_HOURS=8
COOKIE_SECURE=1
COOKIE_SAMESITE=None
PUBLIC_SITE_URL=https://game-services-hwcy.onrender.com
ADMIN_SITE_URL=https://game-services-hwcy.onrender.com
ALLOWED_ORIGINS=https://game-services-hwcy.onrender.com
PUBLIC_API_BASE_URL=https://game-services-hwcy.onrender.com
ALLOW_FILE_ORIGIN=0
```

Optional:

```text
ADMIN_KEY=<emergency-admin-key>
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
LINE_NOTIFY_TOKEN=
```

## Deploy Steps

1. Upload or connect the contents of `backend-deploy-latest.zip`.
2. Use build command:

```text
pip install -r requirements.txt
```

3. Use start command:

```text
python server.py
```

4. Add persistent storage:

```text
mount: /var/data
size: 1GB or higher
```

5. Confirm:

```text
https://your-backend-host.example.com/health
```

The response must be JSON with `success: true`.

## Connect Netlify

After the backend URL works:

```powershell
npm run go-live:connect -- https://your-backend-host.example.com
```

Upload the rebuilt `netlify-deploy-latest.zip` to Netlify.

## Acceptance Test

- Create an order on the Netlify site.
- Confirm the order ID starts with `ORD-`.
- Open admin and confirm the order is visible.
- Change status to `processing`.
- Search the order ID in the public tracker.
- Download one backup from admin.
