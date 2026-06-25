# Production Online Status

## Snapshot

- [x] backend package exists - backend-deploy-latest.zip (24115161 bytes)
- [x] netlify package exists - netlify-deploy-latest.zip (24706892 bytes)
- [x] backend package contents
- [x] netlify package contents
- [x] netlify game catalog injected - games=97
- [x] netlify game images included - images=161, games=97
- [x] backend URL configured - https://game-services-hwcy.onrender.com
- [x] public site URL configured - https://game-services-hwcy.onrender.com
- [x] allowed origins configured - https://game-services-hwcy.onrender.com
- [x] Render live runtime uses primary Render URL
- [x] Render live `/api/games` returns 97 games
- [x] Render live catalog excludes active HEAVENFALL ARENA

## External Tools

- [ ] netlify CLI - not installed
- [ ] railway CLI - not installed
- [ ] render CLI - not installed
- [ ] gh CLI - not installed

## Current Live Status

- Primary production host: `https://game-services-hwcy.onrender.com`
- GitHub source: `main` at commit `2b00833`
- Runtime API base: `https://game-services-hwcy.onrender.com`
- Source active games: 97
- Source active packages: 153
- Backend seed active games: 97
- Backend seed active packages: 153
- Static ZIP games: 97
- Live Render games: 97

## Next External Step

1. Keep Render as the main production site.
2. Use Netlify only as a static mirror if needed.
3. Create one real test order from the Render site and confirm the order ID starts with `ORD-`.
4. Open admin on Render and verify the order appears, status updates, and tracking can find it.
