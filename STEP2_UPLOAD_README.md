# Step 2 Backend Upload

Upload this folder to Render or Railway as the backend service source.

## Recommended Render Settings

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `python server.py`
- Health check path: `/health`
- Persistent disk:
  - Mount path: `/var/data`
  - Size: 1GB or higher

## Required Environment Variables

Use `RENDER_ENV_PLACEHOLDERS.txt` in this folder. Replace placeholder values in the Render/Railway dashboard.

## After Deploy

1. Open `https://your-backend-host/health`.
2. Confirm JSON returns `success: true`.
3. In the local project, run:

```powershell
npm run go-live:connect -- https://your-backend-host
```

4. Upload the rebuilt `netlify-deploy-latest.zip` to Netlify.
5. Create one real test order and confirm the ID starts with `ORD-`.
