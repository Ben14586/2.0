# Production Online Status

## Snapshot

- [x] backend package exists - backend-deploy-latest.zip (1753570 bytes)
- [x] netlify package exists - netlify-deploy-latest.zip (1622000 bytes)
- [x] backend package contents
- [x] netlify package contents
- [x] netlify game catalog injected - games=16
- [x] netlify game images included - images=16, games=16
- [x] backend URL configured - https://two-0-ayb0.onrender.com
- [x] public site URL configured - https://store-game-0.netlify.app
- [x] allowed origins configured - https://store-game-0.netlify.app

## External Tools

- [ ] netlify CLI - not installed
- [ ] railway CLI - not installed
- [ ] render CLI - not installed
- [ ] gh CLI - not installed

## Next External Step

1. Deploy `backend-deploy-latest.zip` to Render or Railway.
2. Confirm online `/health` returns success.
3. Run:

```powershell
npm run go-live:connect -- https://your-backend-host.example.com
```

4. Upload the rebuilt `netlify-deploy-latest.zip` to Netlify.
5. Create one real test order from the Netlify site and confirm the order ID starts with `ORD-`.
6. Open admin and verify the order appears, status updates, and tracking can find it.

## Current Blocker

The project is packaged locally. The remaining blocker is an external backend host URL/account session. Netlify alone cannot create durable online orders without that backend URL.
