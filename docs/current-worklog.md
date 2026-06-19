# Current Worklog

## 2026-06-19 - Game Images, Pro UI, Buttons

User requested:

- Add images to every game card.
- Remove "แพ็กยอดนิยม".
- Make all visible buttons/nav actions functional.
- Improve the site to feel more professional, easy, safe, and production-ready.
- Create `.md` handoff documentation at every work stage so another AI can continue fast.

Actions taken so far:

- Read `skills/game-services-guardian/SKILL.md`.
- Inspected `index.html`, `admin.html`, `server.py`, `tools/qa_check.py`, `database.db`, and `uploads/`.
- Found only Samkok and an inactive Heavenfall record had DB images.
- Added `tools/sync_game_media.py` to fill `play_image`, `play_store`, and `catalog_type` from the existing reference catalog in `index.html`.
- Added `npm run sync:media`.
- Ran `npm run sync:media`; active games now have images.
- Added `tools/cache_game_media.py` and `npm run cache:media`.
- Ran `npm run cache:media`; 16 active game images were downloaded into `uploads/game-images/` and the database now points to local image paths.
- Added QA checks for media sync, active game images, and deploy zip image inclusion.
- Updated `frontend/styles/theme.css` button/secondary-action styling.
- Updated `index.html`:
  - Nav items are real links.
  - "แพ็กยอดนิยม" removed.
  - `#trust` anchor added.
  - `#games` moved above `#creator-reference`.
  - Game cards now render gameplay/Play Store preview image area.
  - Package button no longer says "เลือกแพ็คแนะนำ"; it says "เลือกแพ็คนี้".
  - `showServiceDetail()` no longer reveals `#orderSuccess` early.
- Updated `skills/game-services-guardian` to include media sync rules.
- Ran:
  - `npm run build`
  - `npm run export:static`
  - `npm run export:excel`

Validation completed:

- `npm run qa` passed.
- `npm run smoke` passed against `http://127.0.0.1:3000`.
- `npm run package:backend` passed.
- Browser visual QA confirmed:
  - `#games` appears before `#creator-reference`.
  - 16/16 game images load after scrolling the lazy-loaded grid.
  - First game "ดูแพ็คเกจ" opens package/order sections.
  - `#orderSuccess` stays hidden until an order is actually created.
  - Mobile 390px viewport has no horizontal overflow.

Latest artifacts already refreshed during this work:

- `netlify-deploy-latest.zip`
- `exports/game-services-operations-latest.xlsx`
- `backend-deploy-latest.zip`

Next recommended work:

- Do a visual browser pass on desktop/mobile if the user wants more polish on spacing, image crop, or button hierarchy.
- Consider a deeper Thai text encoding cleanup later, but only as a dedicated task because broad rewrites can touch many strings.

## 2026-06-19 - Production Online Readiness

User requested continuing to the next step after visual QA.

Actions taken:

- Ran `npm run phase3:preflight`.
- Confirmed packages are ready:
  - `backend-deploy-latest.zip`
  - `netlify-deploy-latest.zip`
- Confirmed current external blocker:
  - real backend host URL is not configured yet.
  - external CLIs (`netlify`, `railway`, `render`, `gh`) are not installed/logged in locally.
- Added `tools/write_go_live_status.py`.
- Added `npm run go-live:status`.
- Generated `docs/production-online-status.md`.
- Added `tools/configure_site_origin.py`.
- Added `npm run configure:site`.
- Ran `npm run configure:site -- https://store-game-0.netlify.app`.
- `.env` now has:
  - `PUBLIC_SITE_URL=https://store-game-0.netlify.app`
  - `ADMIN_SITE_URL=https://store-game-0.netlify.app`
  - `ALLOWED_ORIGINS=https://store-game-0.netlify.app`

Remaining external blocker:

- Deploy backend to Render/Railway.
- Get the backend URL.
- Run `npm run configure:backend -- https://your-backend-host`.
- Re-export Netlify zip.
- Upload the new zip to Netlify.

## 2026-06-19 - Backend Deploy Hardening

User requested continuing the next step.

Actions taken:

- Added backend host entry files:
  - `Dockerfile`
  - `.dockerignore`
  - `Procfile`
- Added `docs/backend-deploy-checklist.md` for Render/Railway deployment handoff.
- Updated `tools/package_backend.py` so `backend-deploy-latest.zip` includes:
  - Docker/Procfile deployment files.
  - `docs/backend-deploy-checklist.md`.
  - cached game images from `uploads/game-images/`.
- Added `CURATED_GAME_MEDIA` in `server.py`.
- Updated `seed_curated_catalog()` so a fresh backend database can self-fill:
  - `catalog_type`
  - `reference_title`
  - local `/uploads/game-images/...` preview image paths
  - Play Store links
- Added QA guards for:
  - Dockerfile and Procfile presence.
  - backend deployment checklist presence.
  - curated game media seed presence.
  - backend package script including game images.
  - backend zip containing deployment files and 16 game images.
  - backend zip excluding live `database.db` and slip uploads.

Why this matters:

- A new backend host should not lose all game images or Play Store metadata just because the live local SQLite database is not uploaded.
- Backend deployment zip is now safer: it includes public game media assets, but excludes live database and customer slip uploads.

Next validation:

- Run Python compile.
- Rebuild `netlify-deploy-latest.zip`.
- Rebuild `exports/game-services-operations-latest.xlsx`.
- Rebuild `backend-deploy-latest.zip`.
- Run `npm run qa`.
- Run `npm run phase3:preflight`.
- Regenerate `docs/production-online-status.md`.

## 2026-06-19 - Live Deploy Attempt And One-Command Connect

User requested starting the remaining live deployment steps.

Actions taken:

- Checked local deploy CLIs:
  - `netlify` not installed/logged in as a usable local command.
  - `railway` not installed/logged in as a usable local command.
  - `render` not installed as a usable local command.
  - `gh` not installed as a usable local command.
- Checked environment for deploy tokens without printing secrets:
  - no `NETLIFY`, `RENDER`, `RAILWAY`, `VERCEL`, `GH_`, or `GITHUB` token env vars were present.
- Confirmed current blocker remains external account/session access for backend hosting.
- Added `tools/go_live_connect.py`.
- Added `npm run go-live:connect`.

New command after backend is hosted:

```powershell
npm run go-live:connect -- https://your-backend-host.example.com
```

## 2026-06-20 - Telegram Bot Operations Alerts

User asked whether a Telegram bot can be made useful for the website.

Actions taken:

- Upgraded Telegram/LINE operations notifications in `server.py`.
- New order notifications now use cleaner structured operations messages with admin link.
- Added slip upload notification after slip hash/image validation succeeds.
- Added order status change notification when admin updates an order.
- Added admin test endpoint:
  - `POST /api/admin-test-telegram`
- Added admin button:
  - `ทดสอบ Telegram`
- Added documentation:
  - `docs/telegram-bot-ops.md`
- Added QA guards for Telegram endpoint, admin button, and docs.

Production setup required:

- Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Render/Railway environment variables.
- Use the admin `ทดสอบ Telegram` button after deploy.

This command runs:

- backend URL configuration
- static Netlify export
- QA
- online smoke test
- Phase 4 online dry run
- production status doc update

After it passes:

- upload the refreshed `netlify-deploy-latest.zip` to Netlify
- create one real browser order
- confirm the order ID starts with `ORD-`

## 2026-06-19 - Token System Hardening

User requested making the token system complete.

Actions taken:

- Upgraded admin session storage in `server.py`:
  - raw browser token is still returned only to the admin browser.
  - SQLite now stores `session_sha256$...` token hashes for new logins.
  - legacy raw tokens remain supported until they expire.
  - expired tokens are cleared when presented.
  - logout revokes the active session token in the database and clears the cookie.
- Added `tools/manage_tokens.py`.
- Added commands:
  - `npm run tokens:check`
  - `npm run tokens:setup`
- Ran `npm run tokens:setup`.
  - Missing local `ADMIN_KEY` was generated and saved in `.env`.
  - Secret values were not copied into docs or public files.
- Added `docs/token-system.md`.
- Updated `.env.example` and `production.env.example` with token setup guidance.
- Added QA guards for:
  - hashed session token helpers.
  - token manager CLI.
  - token system documentation.

Next validation:

- Compile Python files.
- Run `npm run qa`.
- Run local smoke/admin checks.
- Rebuild public/backend artifacts because docs/tools changed.

## 2026-06-19 - Step 2 Backend Online Preparation

User clarified that the Netlify frontend is online and requested starting Step 2 with an upload plan.

Actions taken:

- Confirmed Netlify is only the static frontend. Full online order/admin flow still needs hosted backend.
- Verified current `backend-deploy-latest.zip` contains required backend files and 16 game images.
- Regenerated `docs/production-online-status.md` because it previously captured a stale zip state while packaging.
- Added `tools/prepare_step2_release.py`.
- Added `npm run step2:prepare`.
- Added `docs/step2-backend-online-plan.md`.
- Added QA guards for the Step 2 preparation tool and plan.

Step 2 release purpose:

- Extract `backend-deploy-latest.zip` into `step2-backend-release/`.
- Add `STEP2_UPLOAD_README.md`.
- Add `RENDER_ENV_PLACEHOLDERS.txt`.
- Add `step2-checksums.json`.

External blocker:

- Actual backend upload still requires a Render/Railway account session or deploy token.

After backend is hosted:

```powershell
npm run go-live:connect -- https://your-backend-host.example.com
```

## 2026-06-20 - Render Dockerfile Upload Incident

Render deploy failed before running app code with:

- `dockerfile parse error on line 1: unknown instruction`
- log showed `JFIF`, which is a JPEG file header.

Verified locally:

- Local `Dockerfile` is valid text and starts with `FROM python:3.12-slim`.
- `step2-backend-release.zip` contains a valid 250-byte `Dockerfile`.
- GitHub raw `Ben14586/2.0/main/Dockerfile` currently returns JPEG bytes instead of Dockerfile text.

Required fix:

- Replace the GitHub `Dockerfile` file with the real text file from `step2-backend-release/Dockerfile` or the project root `Dockerfile`.
- Do not upload screenshots/images into the `Dockerfile` path.
- After replacing it, run Render `Manual Deploy` again.

## 2026-06-20 - Render Backend Live and Netlify Connected

Render service is live:

- Backend URL: `https://two-0-ayb0.onrender.com`
- Render log shows `Your service is live`.
- `/health` returns HTTP 200 with database available.

Actions taken:

- Fixed Windows go-live tooling so Python scripts resolve `npm.cmd` by absolute path.
- Ran:
  - `npm run go-live:connect -- https://two-0-ayb0.onrender.com`
- Rebuilt `netlify-deploy-latest.zip` with the live backend URL.
- Online smoke test passed against `https://two-0-ayb0.onrender.com`.
- Phase 4 online dry-run passed.
- Wrote updated `docs/production-online-status.md`.

Next action:

- Upload refreshed `netlify-deploy-latest.zip` to Netlify.
- In Render environment, set `PUBLIC_API_BASE_URL=https://two-0-ayb0.onrender.com` so backend-generated admin links and runtime config no longer show the placeholder.
- Create one real browser order and confirm the order ID starts with `ORD-`.

## 2026-06-20 - Admin Dark Tone Pass

User requested a darker admin tone because form fields looked washed out.

Actions taken:

- Removed the public site theme stylesheet from `admin.html` to prevent light public styles from leaking into the admin surface.
- Strengthened admin dark variables:
  - dark page background.
  - opaque dark cards.
  - dark input/select/textarea fields.
  - readable select options.
  - visible focus state.
  - disabled/readonly fields no longer turn pale.
- Rebuilt `dist/admin.html` and `netlify-deploy-latest.zip`.
- Ran QA successfully.

Validation:

- `admin.html` and `dist/admin.html` both include the dark panel/field/option styles.
- `netlify-deploy-latest.zip` refreshed after the dark pass.

## 2026-06-20 - Package Sales Copy Enrichment

User requested richer copy after `Free Purchase` so every game looks more purchase-worthy.

Actions taken:

- Added `PACKAGE_SALES_COPY` in `server.py`.
- Added `apply_package_sales_copy(cursor)` to keep seed/new deploy data enriched automatically.
- Updated the current SQLite database by importing `server.py`, which runs init and applies the sales copy.
- Enriched all 16 active game packages with:
  - better subtitle.
  - clearer package description.
  - 5+ feature/highlight pills.
  - delivery/support/guarantee/audience text.
- Rebuilt `netlify-deploy-latest.zip`.
- Ran QA successfully.

Validation:

- Static Netlify package contains 16 games.
- Every active game package has a subtitle.
- Minimum feature count per active game package is 5.

## 2026-06-20 - Netlify Continuous Deploy Setup

User requested a way to stop manually uploading the Netlify ZIP every time.

Actions taken:

- Updated `netlify.toml` for Git-based continuous deployment:
  - build command: `npm run export:static`
  - publish directory: `netlify-deploy`
  - public backend/site environment values included for reliable static runtime config.
- Added `docs/netlify-continuous-deploy.md` with one-time Netlify linking steps.

Expected workflow after one-time setup:

- Link Netlify site `store-game-0` to GitHub repo `Ben14586/2.0`.
- Push/upload source changes to GitHub.
- Netlify builds and deploys automatically.
- Manual ZIP upload becomes emergency fallback only.

## 2026-06-20 - Admin Login Runtime Config Fix

User reported the live Netlify admin could not log in.

Finding:

- Live `https://store-game-0.netlify.app/runtime-config.js` returned `apiBaseUrl:""`.
- That made `admin.html` post `/api/admin/login` to Netlify instead of the Render backend.
- Render backend login endpoint is reachable and correctly returns HTTP 401 for bad credentials.

Actions taken:

- Added a production fallback backend URL in `runtime-config.js`:
  - `https://two-0-ayb0.onrender.com`
- Updated `server.py` `build_runtime_config_js()` to use the same fallback when `PUBLIC_API_BASE_URL` is empty.
- Rebuilt `netlify-deploy-latest.zip`.
- Verified the ZIP runtime config contains `https://two-0-ayb0.onrender.com`.
- Ran QA successfully.

Next action:

- Deploy the refreshed Netlify package or push the updated source to GitHub so Netlify rebuilds.
- After deploy, `https://store-game-0.netlify.app/runtime-config.js` must show the Render backend URL.
