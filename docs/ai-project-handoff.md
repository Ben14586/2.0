# AI Project Handoff - Game Services

## Project Purpose

Game Services is a storefront and admin system for mobile game service packages. The project has a public catalog, game/package detail flow, order creation, slip upload/checking, order tracking, admin management, Excel export, static Netlify export, and backend deploy packaging.

## Current Runtime Shape

- Public site: `index.html`
- Admin site: `admin.html`
- Backend/API/static export: `server.py`
- Live local database: `database.db`
- Upload storage: `uploads/`
- Frontend build output: `dist/`
- Static deploy package: `netlify-deploy-latest.zip`
- Backend deploy package: `backend-deploy-latest.zip`
- Operations workbook: `exports/game-services-operations-latest.xlsx`
- Production status: `docs/production-online-status.md`

## Important Rules

- Do not delete or reset `database.db`, `uploads/`, `.env`, or user-provided source files.
- Do not expose generated `ADMIN_KEY`, admin passwords, deploy provider tokens, or session tokens in chat/docs/public files.
- Do not re-enable `HEAVENFALL ARENA`; it is intentionally inactive.
- Public site changes must end with `npm run export:static` so `netlify-deploy-latest.zip` is fresh.
- Backend/API changes should end with `npm run package:backend`.
- Backend deploy package must include Docker/Procfile files and `uploads/game-images/`, but must exclude `database.db` and private slip uploads.
- Data structure changes should keep `npm run export:excel` working.
- Active games must have preview images; run `npm run sync:media` if images/Play Store links are missing.
- Avoid bringing back removed public sections such as tutorial, wallet, public package error cards, or "แพ็กยอดนิยม".

## Latest Completed Work

- Added operations Excel export through admin and CLI:
  - Admin button: `Export Excel`
  - API: `/api/admin-export-excel`
  - CLI: `npm run export:excel`
  - Output: `exports/game-services-operations-latest.xlsx`
- Added project-local skill:
  - `skills/game-services-guardian/SKILL.md`
  - `skills/game-services-guardian/references/project-map.md`
- Added game media sync:
  - `tools/sync_game_media.py`
  - CLI: `npm run sync:media`
- Added game media cache:
  - `tools/cache_game_media.py`
  - CLI: `npm run cache:media`
  - Stores active game images under `uploads/game-images/` and updates `games.play_image` to local `/uploads/game-images/...` paths.
- Added backend deployment hardening:
  - `Dockerfile`
  - `.dockerignore`
  - `Procfile`
  - `docs/backend-deploy-checklist.md`
  - `server.py` now has `CURATED_GAME_MEDIA` so a fresh backend database can seed game images and Play Store links.
- Added token hardening:
  - `server.py` stores new admin sessions as `session_sha256$...` hashes.
  - Logout revokes the active token.
  - `tools/manage_tokens.py`
  - `npm run tokens:check`
  - `npm run tokens:setup`
- `docs/token-system.md`
  - Token and secret handling guide.
- `tools/prepare_step2_release.py`
  - Extracts `backend-deploy-latest.zip` into `step2-backend-release/` with upload README, Render env placeholders, and checksums.
- `docs/step2-backend-online-plan.md`
  - Step 2 backend online deployment plan and acceptance criteria.
- `docs/telegram-bot-ops.md`
  - Telegram BotFather setup, env names, and admin test button usage.
- Added Telegram operations alerts:
  - new orders notify operations chat.
  - slip uploads notify operations chat.
  - admin order status updates notify operations chat.
  - admin panel has `ทดสอบ Telegram` button.
- Updated all active games in `database.db` with Play Store preview images and Play Store links from the existing reference catalog.
- Removed public nav item "แพ็กยอดนิยม".
- Converted public nav labels into working section links.
- Added image media area to every game card.
- Moved `#games` above `#creator-reference` so the purchase path appears earlier.
- Prevented `#orderSuccess` from showing when the user only clicks "ดูแพ็คเกจ".

## Key Commands

```powershell
# Frontend / Python backend
npm run build
npm run export:static
npm run export:excel
npm run qa
npm run smoke
npm run package:backend
npm run phase3:preflight
npm run configure:site -- https://game-services-hwcy.onrender.com
npm run go-live:connect -- https://your-backend-host.example.com
npm run step2:prepare
npm run tokens:check
npm run tokens:setup
npm run go-live:status

# Backend-node (Node.js/Express)
cd backend-node && npm test           # 84 tests
cd backend-node && npm start          # Production server on port 5000

# Python tools (use wrapper since Python 3.13 was removed)
./python tools/build_frontend.py
./python tools/qa_check.py
./python tools/export_static.py
./python tools/package_backend.py
./python tools/export_excel.py
./python tools/cache_game_media.py
```

## Validation Expectations

Before handing work back:

- `npm run build` passes.
- `npm run export:static` passes and updates `netlify-deploy-latest.zip`.
- `npm run qa` passes.
- `npm run smoke` passes if backend is running at `http://127.0.0.1:3000`.
- `npm run export:excel` passes when data/admin/export logic changed.
- `npm run package:backend` passes when backend/tools changed.

## Current Notes For Next AI

- The HTML contains some mojibake from earlier file history, but the app currently works. Prefer small scoped patches over broad text rewrites unless fixing the encoding globally.
- `index.html` has a reference catalog array with Play Store image URLs. `tools/sync_game_media.py` reads that and updates the database.
- `tools/cache_game_media.py` downloads active game images to local uploads and should be used before deploy if any active game points to an external image URL.
- Static fallback in `index.html` also fills missing `playImage` from reference data, so new backend deploys do not show initials-only cards when reference data exists.
- `server.py export_netlify_deploy()` builds Vite, copies `dist`, injects active games into `index.html`, writes `runtime-config.js`, copies game image uploads, and zips.
- `server.py seed_curated_catalog()` uses `CURATED_GAME_MEDIA` to fill missing `catalog_type`, `reference_title`, `play_image`, and `play_store` on fresh backend deployments.
- `backend-deploy-latest.zip` should contain `uploads/game-images/` so those seeded local image paths resolve online.
- Vite may warn that `runtime-config.js` is not bundled because it is a normal script. This is expected and not a failure.
- `PUBLIC_SITE_URL`, `ADMIN_SITE_URL`, and `ALLOWED_ORIGINS` are configured for `https://game-services-hwcy.onrender.com`.
- Render primary host is `https://game-services-hwcy.onrender.com`; frontend and API should point to the same origin unless a separate backend is intentionally promoted.
- Preferred after backend hosting: run `npm run go-live:connect -- <backend-url>` because it configures the backend URL, rebuilds `netlify-deploy-latest.zip`, runs QA, runs online smoke, runs Phase 4 dry-run, and refreshes production status.
- Local environment currently has no usable Netlify/Render/Railway/GitHub CLI session or deploy token, so external backend hosting must be done through a logged-in account/session first.
- `.env` has local secret values. Never print or paste them into final responses.
- Step 2 upload material can be regenerated with `npm run step2:prepare`; upload `step2-backend-release/` or `backend-deploy-latest.zip` to Render/Railway.
- Telegram alerts require `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` on the backend host. Test from admin with `ทดสอบ Telegram`.
- **Backend-node (Node.js/Express) is production-ready**: 84/84 tests pass, `backend-node-deploy.zip` (5.3MB) includes database.db + 101 game images + Dockerfile + Procfile + render.yaml. Deploy to Render/Railway when ready to replace Python backend.
- **All 97 active games have local cached images**: `uploads/game-images/` has 101 files. No external image dependencies remain.
- **Python environment was broken** (Python 3.13 removed). Fixed by downloading portable Python to `python_portable/`. Use `./python` wrapper in bash or `python.bat` in cmd for all tool execution.
- **Backend-node env.js** now handles missing `.env` gracefully for container deploys. Database auto-initializes on first startup if tables don't exist.
