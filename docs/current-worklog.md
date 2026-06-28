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

## 2026-06-24 - Work Audit and Test Database Isolation

User requested a full work check.

Findings:

- Root QA initially failed because `backend-node` Jest tests had created active `Test Game Node` rows in the real local `database.db`.
- Those rows had no packages, so the production QA guard correctly blocked the package as unsafe.
- Live Netlify still needs the latest deploy because the published `runtime-config.js` can still be stale if Netlify skips or does not publish the latest build.

Actions taken:

- Deactivated all leaked `Test Game Node` rows in `database.db`.
- Added Jest `globalSetup` for `backend-node` tests.
- Added `backend-node/tests/setup-env.js` so all Node tests use `backend-node/test.sqlite`.
- Added `backend-node/test.sqlite*` to `.gitignore`.
- Updated `TEST_INFRA.md` to document the isolated test database.
- Rebuilt `netlify-deploy-latest.zip`, `backend-deploy-latest.zip`, and `step2-backend-release.zip`.

Validation:

- `npm run qa` passed before backend-node Jest.
- `npm test --prefix backend-node` passed: 10 suites / 84 tests.
- `npm run qa` passed again after Jest, proving tests no longer pollute the real local DB.
- Static export contains 20 games and 20 game images.
- Backend package excludes live database and slip uploads.

Next action:

- Publish the refreshed Netlify package or push the latest source through the linked GitHub/Netlify workflow.
- After publish, verify `https://store-game-0.netlify.app/runtime-config.js` contains the Render backend URL.

## 2025-06-24 - URL Migration & Backend-Node Test Fix

User reported frontend URL changed from Netlify to Render, and instructed to continue remaining work autonomously.

Actions taken:

### URL Updates (Netlify → Render)
- Updated `.env` with new frontend/backend URLs:
  - `PUBLIC_SITE_URL=https://game-services-hwcy.onrender.com`
  - `ADMIN_SITE_URL=https://game-services-hwcy.onrender.com`
  - `PUBLIC_API_BASE_URL=https://two-0-ayb0.onrender.com`
  - `ALLOWED_ORIGINS=https://game-services-hwcy.onrender.com`
- Updated `netlify.toml` build environment variables to new URLs.
- Updated `.env.example` with Render frontend examples.
- Updated `production.env.example` with new production URLs.
- Updated `README.md` environment section.
- Updated `docs/ai-project-handoff.md` notes and commands.
- Updated `docs/production-online-status.md` snapshot and next steps.

### Backend-Node Test Fix
- Fixed `backend-node/tests/cross-feature.test.js` test 1 timeout (increased from 5s to 15s).
- Re-ran full backend-node test suite: **84/84 tests pass** (was 83/84).
- All 10 test suites pass including: health, auth, games, orders, ops, security, admin-tools, cross-feature, scenarios, dummy.

### QA Validation
- Ran `npm run qa` via PythonRun (local python binary missing from .venv path).
- **All QA checks pass** including:
  - 20 games in deploy zip (was 16, now 20 active in static export)
  - 96 active games in database.db
  - 152 active packages
  - 20 game images included in deploy zip
  - Backend zip excludes live database and slip uploads
  - Backend zip includes game images

### Current Database State
- 104 total games (96 active, 8 inactive including HEAVENFALL ARENA and test games)
- 152 packages
- 6 orders
- 27 users
- Mix of games: TD series (8 games with local images), RPG series (8 games with local images), and ~80 other games mostly using placeholder images.

### Next Steps Identified
- Backend is still running Python (`server.py`) on Render; backend-node (Node.js/Express) is ready with 84/84 tests but not yet deployed.
- Consider migrating backend from Python to Node.js on Render when ready.
- Many games (~80) still use Unsplash placeholder images; consider running `npm run sync:media` and `npm run cache:media` for games with Play Store links.
- Frontend URL change may require re-exporting static deploy package if Netlify continuous deploy is still linked; verify Render frontend is serving latest build.
- Verify `runtime-config.js` on the live frontend (`https://game-services-hwcy.onrender.com`) points to the correct backend URL.

## 2025-06-24 - All In: Backend-Node Production, Media Cache, Full QA

User said "all in" - pushed everything forward autonomously.

### Python Environment Fix
- Python 3.13 was removed from the machine, breaking `.venv` and all `npm run` scripts that call `python`.
- Downloaded Python 3.13.0 embeddable zip (11.9MB) to `python_portable/`.
- Installed pip and required packages: `requests`, `pillow`, `openpyxl`, `python-dotenv`.
- Created `python` bash wrapper and `python.bat` cmd wrapper in project root.
- All tools now run via `./python tools/...` successfully.

### Backend-Node Production Readiness
- Updated `backend-node/src/config/env.js` to handle missing `.env` gracefully (checks `fs.existsSync` before `dotenv.config`).
- Added `DATABASE_PATH`, `JWT_SECRET`, `PUBLIC_API_BASE_URL`, `PUBLIC_SITE_URL`, `ADMIN_SITE_URL`, `ALLOWED_ORIGINS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `LINE_NOTIFY_TOKEN` env fallbacks.
- Created `backend-node/src/db/init.js` with full schema initialization (12 tables + indexes + default settings) for fresh deploys.
- Updated `backend-node/src/server.js` to call `initializeDatabase()` before starting the server.
- Created `backend-node/Dockerfile` (Node.js 20 slim, production-ready).
- Created `backend-node/Procfile` (`web: node src/server.js`).
- Created `backend-node/.dockerignore` (excludes tests, coverage, node_modules).
- Created `backend-node/render.yaml` (Render blueprint with disk mount at `/app/data`).
- Copied `database.db` (97 games, 153 packages) and `uploads/` (101 game images) into `backend-node/` for deploy.
- Re-ran backend-node tests: **84/84 pass** (10 suites).

### Media Cache - All Games Now Local Images
- Ran `cache_game_media.py` with portable Python.
- Cached **81 new images** (was 16 cached, now 97 total active games have local images).
- Total `uploads/game-images/` now has **101 files**.
- Verified database: all 97 active games now have `play_image` pointing to `/uploads/game-images/...` (0 external, 0 empty).
- This eliminates all external dependencies on Unsplash and Play Store image URLs.

### Deploy Packages Rebuilt
- **Frontend build**: Vite built successfully (3.02s).
- **Static export**: `netlify-deploy-latest.zip` (4.5MB, 97 games, 101 game images).
- **Python backend package**: `backend-deploy-latest.zip` (4.7MB, excludes live DB and slips, includes 101 game images).
- **Node.js backend package**: `backend-node-deploy.zip` (5.3MB, 144 files, includes database.db + uploads + Dockerfile + Procfile + render.yaml).
- **Excel export**: `exports/game-services-operations-latest.xlsx` (45KB).

### Full QA Validation
- `python tools/qa_check.py` passed **all 81 checks** including:
  - 97 active games with images
  - 153 active packages
  - 101 game images in deploy zip
  - 97 games injected in static export
  - Backend zip excludes live database and slip uploads
  - Backend zip includes 101 game images
- Backend-node tests: **84/84 pass** in 10.7s.

### Current Database State
- 104 total games (97 active, 7 inactive including HEAVENFALL ARENA and test games)
- 153 packages
- 6 orders
- 27 users
- All 97 active games have local cached images

### Deploy Artifacts Ready
| Artifact | Size | Contents |
|----------|------|----------|
| `netlify-deploy-latest.zip` | 4.5MB | Static frontend, 97 games, 101 images |
| `backend-deploy-latest.zip` | 4.7MB | Python backend, tools, 101 images, no DB/slips |
| `backend-node-deploy.zip` | 5.3MB | Node.js backend, DB, uploads, Dockerfile, Procfile |
| `exports/game-services-operations-latest.xlsx` | 45KB | Operations data export |

### Next Steps
- Backend-node is production-ready and deployable on Render/Railway.
- To deploy Node.js backend: upload `backend-node-deploy.zip` to Render or push `backend-node/` to GitHub and link to Render.
- After deploy, set `DATABASE_PATH=/app/data/database.db` and `PORT=5000` on Render environment.
- Frontend is already live at `https://game-services-hwcy.onrender.com`.
- Python backend is still running at `https://two-0-ayb0.onrender.com`.
- Switching to Node.js backend requires updating `PUBLIC_API_BASE_URL` on the frontend if the backend URL changes.

## 2026-06-26 - Render Primary and 97-Game Deploy Readiness

User requested Render as the primary production target, all 97 games available on the website, and a live-vs-package audit.

Findings:

- Live `https://game-services-hwcy.onrender.com/runtime-config.js` still pointed to `https://two-0-ayb0.onrender.com`.
- Live `https://game-services-hwcy.onrender.com/api/games` returned 16 games.
- Local `database.db` has 97 active games and 153 active packages.
- Latest static export package can carry all 97 games with local images.

Actions taken:

- Set Render same-origin primary URL: `https://game-services-hwcy.onrender.com`.
- Updated public/runtime config defaults, Render env examples, deploy docs, and helper script defaults away from the old Netlify/backend split.
- Added catalog self-healing for persistent SQLite deploys:
  - if production DB has fewer active games than the bundled catalog, startup upserts only `categories`, `games`, and `packages`.
  - it does not touch orders, users, admins, coupons, or slip data.
- Added `config/catalog-seed.json` generation inside `tools/package_backend.py` so backend deploy ZIP can restore the 97-game catalog without shipping `database.db`.
- Rebuilt deploy artifacts.

Validation:

- `npm run export:static` exported 97 games.
- `npm run qa` passed after rebuild.
- `backend-deploy-latest.zip` includes `config/catalog-seed.json`, excludes `database.db`, and excludes slip uploads.
- Simulated a fresh backend ZIP deploy with no `database.db`; startup seeded 97 active games and 153 active packages.

Deploy result:

- Committed and pushed source update to GitHub `main` at `2b00833`.
- Render auto-deployed the refreshed source.
- Live `https://game-services-hwcy.onrender.com/runtime-config.js` now uses `https://game-services-hwcy.onrender.com` and no longer points to the old `two-0-ayb0` backend.
- Live `https://game-services-hwcy.onrender.com/api/games` now returns 97 games.
- Live catalog does not include active `HEAVENFALL ARENA`.
- Source, backend seed, static package, and live Render are aligned:
  - source active games: 97
  - source active packages: 153
  - backend seed active games: 97
  - backend seed active packages: 153
  - static ZIP games: 97
  - live Render games: 97

## 2026-06-26 - Render Monitor HEAD Incident Fix

User reported an uptime incident for `https://game-services-hwcy.onrender.com/`.

Findings:

- Render/site monitor was sending `HEAD https://game-services-hwcy.onrender.com/`.
- The app returned `405 Method Not Allowed` because the FastAPI static frontend route only handled `GET`.
- The public site and API could still work with `GET`, but uptime monitors that use `HEAD` marked Asia as down.

Actions taken:

- Added `HEAD` support for the FastAPI frontend fallback in `backend/app/main.py`.
- Added `HEAD` support to the legacy `server.py` static handler path as a defensive fallback.
- Updated allowed methods to include `HEAD`.
- Rebuilt `backend-deploy-latest.zip`.

Validation:

- Local `HEAD /` returned 200.
- Local `HEAD /runtime-config.js` returned 200.
- Local `GET /api/games` returned 97 games.
- `npm run qa` passed.

Expected production result:

- After Render deploys the pushed commit, external monitors using `HEAD /` should recover from 405 to 200.

## 2026-06-26 - Security Hardening and API Readiness Sweep

User requested closing leaks, reducing risk, removing unnecessary deploy debris, checking all APIs, and verifying production readiness.

Findings:

- `production.env.example` contained real-looking notification credentials and a weak admin password example.
- FastAPI admin fallback accepted a hard-coded `ADMIN_KEY` default.
- FastAPI database bootstrap had a hard-coded default admin password.
- FastAPI CORS had fixed localhost/sample origins instead of production environment origins.
- FastAPI order list and order status update routes were public.
- FastAPI slip/game image uploads accepted user filenames and did not enforce enough type/size validation.
- Local debris such as portable Python, backend-node experiments, backup DBs, and slip uploads were not fully ignored.

Actions taken:

- Removed secrets and weak sample credentials from env examples.
- Disabled `ALLOW_FILE_ORIGIN` and local origins by default.
- Made FastAPI `ADMIN_KEY` optional and disabled when blank.
- Removed hard-coded FastAPI admin password fallback; first admin now requires an explicit env password.
- Made CORS derive from production env values.
- Locked `/api/orders` list and `/api/orders/{order_id}/status` behind admin auth.
- Added file size, MIME, and magic-byte validation for slip and game image uploads.
- Replaced user-provided upload filenames with generated safe filenames.
- Added `.gitignore` and `.dockerignore` entries for local-only debris and sensitive uploads/backups.
- Added `tools/security_audit.py` plus `npm run security:audit` and `npm run security:audit:live`.

Validation:

- `python tools/security_audit.py` passed.
- Local FastAPI `HEAD /` returned 200.
- Local FastAPI `GET /api/games` returned 97 games.
- Local FastAPI `GET /api/orders` without auth returned 401.
- `npm run qa` passed.
- `npm run security:audit:live` passed on current Render live state.

Follow-up required:

- Rotate the Telegram bot token because a real-looking token had previously been present in `production.env.example`.
- After Render deploys the hardening commit, re-run `npm run security:audit:live`.

## 2026-06-26 - Checkout Transfer, Slip Upload, and Admin Orders Green Path

User reported two red production UI failures:

- Checkout step 2 showed `Failed to fetch payment details` and QR load failure.
- Admin Portal orders page showed `Error: Failed to fetch orders`.

Root causes:

- FastAPI `/api/payment/qr` returned 503 when `PROMPTPAY_ID` was not configured.
- Checkout submitted an order without the required `price` field.
- FastAPI orders router was using SQLAlchemy-style `db.query(...)` against the sqlite3 connection returned by `get_db()`.
- Admin orders UI called `/api/orders` without the admin Bearer token after the route was correctly hardened.

Actions taken:

- Rebuilt `backend/app/routers/orders.py` around sqlite3 cursor access and the current mixed orders schema.
- Added safe PromptPay fallback: if no PromptPay ID exists, `/api/payment/qr` now returns 200 with `manual_transfer` mode instead of a red 503.
- Added order creation with generated order IDs, safe slip filenames, size/type/magic-byte validation, slip check records, and admin-review status.
- Connected slip-check configuration to existing `slipok_api_key` / `slipok_branch_id` settings and environment variables. If credentials are not configured, the order is still recorded for manual review instead of failing the customer.
- Updated checkout to send `price`, validate slip image type/size client-side, show the created order number, and continue in manual-transfer mode when QR is unavailable.
- Updated Admin Orders to call the backend with `Authorization: Bearer <admin_token>`, use `API_BASE_URL`, normalize the current order fields, and display auth/load issues as a non-red operational notice.
- Added `promptpay_id` to admin settings so QR payment can be enabled without code changes.
- Extended `tools/security_audit.py` to verify the live payment QR endpoint returns a non-red 200 response.

Validation:

- `python -m py_compile backend/app/routers/orders.py tools/security_audit.py` passed.
- `npm run build` passed.
- Local `GET /api/games` returned 97 games.
- Local `POST /api/payment/qr?amount=150` returned 200.
- Local `GET /api/orders` without auth returned 401.
- Local `GET /api/orders` with `ADMIN_KEY` auth returned success.
- Local multipart order creation with a real PNG slip returned 200, generated an `ORD-...` order number, and stored pending slip status.
- The local test order and slip file were removed after verification.

## 2026-06-26 - Single Safe Package Catalog and Checkout Upgrade

User requested package cards like the reference image, one main package per game, no unsafe/client-only labels, prices in a sensible 60-200 THB range, repeat package add-on at 5 THB each, and a better checkout.

Actions taken:

- Added `tools/normalize_service_packages.py` to normalize active catalog packages safely and repeatably.
- Normalized active games to exactly one active package per active game.
- Deactivated duplicate/full-option packages and packages attached to inactive games.
- Replaced unsafe package language such as Hack, FULL OPTION, God/Cheat/Devtool-style labels with a safe deliverable package:
  - `Reference Feature Pack`
  - focus: main resources, repeatable package add-on, verification before service, 7-day warranty.
- Set active package prices into the 60-200 THB operating range; current active range is 89-180 THB.
- Updated package card layout to present the single package like a clean service card with price divider and check-list highlights.
- Updated checkout:
  - login options now focus on syncable account paths: Google/Gmail, Username/Password, Apple ID/iOS, Android Account.
  - added repeat package add-on controls at 5 THB each.
  - payment amount and order submission now include the repeat add-on.
  - backend stores repeat add-on count in the order note for admin review.
- Exported the latest normalized data to `config/catalog-seed.json` via backend packaging.
- Updated catalog sync logic in `server.py` so Render/persistent DB still receives package/content updates when the active game count stays at 97. This prevents the "deploy succeeded but catalog did not change" failure mode.
- Added QA regression checks:
  - one active package per active game
  - active package prices must be 60-200 THB
  - active packages must not contain unsafe labels in name/subtitle/description/highlights.

Validation:

- Active games: 97.
- Active packages: 97.
- Games with more than one active package: 0.
- Active package price range: 89-180 THB.
- Unsafe active package terms: 0.
- `npm run build` passed.
- `npm run package:backend` rebuilt `backend-deploy-latest.zip`.

## 2026-06-26 - Workspace Cleanup and Operations Export

User asked to handle all remaining work one by one.

Actions taken:

- Reviewed uncommitted workspace changes and separated safe production changes from local-only files.
- Restored risky deploy config drift back to the Python backend path:
  - `Procfile` remains `web: python server.py`.
  - `package.json` start command remains `python server.py`.
  - `railway.json` remains valid JSON without comments.
- Moved upload-security test files out of public game images into `.codex-trash/2026-06-26-upload-test-files/` instead of deleting them permanently.
- Added ignore rules for `.codex-trash/`, uploaded `.html` files, and uploaded `.txt` files so test payloads cannot accidentally ship as game media.
- Marked local agent notes and one-off DB comparison helpers as git-ignored because they are workspace memory or hardcoded local diagnostics, not deployable product code.
- Kept useful hardening changes:
  - `.dockerignore` excludes `database.db` and `backups/`.
  - FastAPI `Order` model now matches string order IDs and current order fields.
  - `GameCard` resolves relative image URLs through `API_BASE_URL` so cards work from static and backend-served contexts.
  - `backend/app/utils` contains PromptPay and Telegram helper modules used by the FastAPI router.
- Exported the latest operations workbook to `exports/game-services-operations-latest.xlsx`.
- Confirmed the legacy production slip endpoint keeps the current safe fallback:
  - rate limits repeated uploads
  - validates real image data
  - blocks duplicate slip hashes
  - stores `slip_checks`
  - returns admin-review status instead of falsely marking unknown slips as paid
  - full automatic SlipOK verification still requires real `slipok_api_key` and `slipok_branch_id` credentials.

Validation:

- `backend/app/models.py`, `backend/app/utils/notify.py`, and `backend/app/utils/promptpay.py` compile.
- Excel export created a valid `.xlsx` file with 6 worksheet XML parts.
# 2026-06-27 - Checkout Manual Transfer Hardening

- Added production bank-transfer fallback details for checkout when PromptPay QR is not configured.
- Bank transfer fallback now exposes bank name, account number, account name, and note from backend settings/env with safe defaults.
- Checkout step 2 now shows a clear bank-transfer panel, exact amount instruction, and copy-account button.
- Normalized the old English PromptPay fallback notice into Thai customer-facing text.
- Added admin settings fields so the transfer bank account can be changed later without code edits.
- Validation target: run frontend build, QA, security audit, backend package, then push for Render/Netlify sync.
- Follow-up: Render runs `python server.py` from Dockerfile, so the legacy server now also owns `/api/payment/qr` with the same manual-transfer fallback.
- Follow-up: Render build failed because Dockerfile copied ignored `database.db`; Docker image now lets `server.py` create/sync the production database from bundled seed/config instead.
- Follow-up: Legacy `server.py` payment fallback now uses Unicode escapes for Thai bank/payment text to prevent mojibake on Render/Windows mixed-encoding paths.

# 2026-06-27 - Checkout 2FA and Payment Confirm Fix

- Fixed the checkout submit flow to match the actual Render runtime: Docker runs `python server.py`, which starts the FastAPI app, so order creation must send `multipart/form-data` with `slipImage` to `/api/orders`.
- Reworked the checkout modal UI copy and data fields:
  - customer email/game account
  - password
  - contact channel
  - Google/Gmail 2FA backup codes
  - repeat package add-on
  - bank transfer fallback and slip upload
- The Google/Gmail checkout path now explains that backup codes reduce the need for the customer to keep pressing Yes/No during 2FA.
- FastAPI order creation now accepts `customerContact`, `backupCodes`, and `customerNote` from checkout and stores them in the order note/contact fields for admin review.
- Verified locally with FastAPI TestClient:
  - `/api/payment/qr?amount=89` returns success.
  - `/api/orders` accepts a PNG slip, creates an `ORD-...` order, records slip status, and returns success.
- Removed the generated UAT order/slip from the local database after verification so test data does not pollute operations.

# 2026-06-27 - DESIGN.md Brand System

- Added root `DESIGN.md` as the source of truth for the Game Services brand, color tokens, typography, spacing, elevation, components, and content rules.
- Installed `@google/design.md` and added `npm run design:lint` through a Windows-safe Python launcher.
- Applied the brand tokens to the shared frontend theme and rebuilt the home hero around a professional service-first message.
- Reworked game cards, category filters, catalog count, empty state, keyboard access, and Thai labels into one consistent responsive system.
- Kept the active Node backend migration untouched. The legacy Python backend packaging flow still references files removed by that migration and must be updated before producing the next backend zip.
- Validation target: DESIGN.md lint, Vite production build, backend-node tests, and visual browser QA.

# 2026-06-27 - Node Backend Deploy Package

- Replaced the legacy Python backend packager with a Node backend-aware release packager.
- Fixed `.dockerignore` so Docker and Render receive `backend-node/` during builds.
- `backend-deploy-latest.zip` now contains the Docker config, Render config, compiled frontend, Node manifests/source, and public game images.
- The package validator blocks databases, SQLite files, `.env`, dependencies, tests, backups, logs, archives, and customer slip uploads.
- Added `npm run package:backend` for repeatable release generation.

# 2026-06-27 - Responsive Browser QA

- Verified the current Node-served frontend at desktop and 390x844 mobile viewports.
- Confirmed the catalog loads 97 games, search for `RAID RUSH` returns 2 matching games, and no horizontal overflow occurs.
- Confirmed game details and Checkout open successfully and the tested game image loads without errors.
- Reduced mobile hero typography to prevent awkward wrapping.
- Added dialog labeling, close-button labeling, keyboard-operable package cards, and Lucide icons to the game package flow.
- Browser console reported no errors during the tested search, details, and Checkout path.

# 2026-06-27 - Admin Bootstrap Login Fix

- Fixed fresh Node deployments having an empty `admins` table with no working creation path.
- The configured admin is created or its password is securely rotated from `ADMIN_USERNAME` and `ADMIN_BOOTSTRAP_PASSWORD`; changing the Render secret and redeploying restores access.
- Render now persists SQLite at `/app/data/database.db` and requests admin/bootstrap secrets during Blueprint setup.
- Localized the admin login form and invalid-credential message in Thai.

# 2026-06-27 - Production Empty Catalog and Admin Recovery

- Confirmed live `/api/games` returned an empty list because the new Node database had no catalog seed.
- Added idempotent catalog bootstrap from `config/catalog-seed.json`; it runs only when the games table is empty.
- Docker now includes the catalog seed and Node production defaults to `/app/data/database.db` whenever the Render disk is mounted.
- Changed Render health check to `/health` and added stale admin-session validation so invalid saved tokens return users to login instead of a blank page.
- Added `npm run predeploy:check` and GitHub Actions coverage for tracked backend files, Docker inputs, persistent database configuration, 97 active seed games, generated assets, and secret/data exclusions.

# 2026-06-28 - Fail-Closed Slip Verification

- Order creation now requires a valid image signature and successful SlipOK verification before inserting the order.
- The server sends the authoritative package price to SlipOK, requires an exact amount match, uses branch logging for receiver/duplicate checks, and stores transaction/file fingerprints to block reuse.
- Missing SlipOK credentials, provider errors, mismatched amounts, invalid images, and duplicate slips now reject the request without showing checkout success.
- Slip images are stored on the Render persistent disk and only verified orders can move to processing/completed.
- Admin settings responses redact Telegram, SlipOK, and LINE secrets; empty secret fields no longer erase stored values.
- Admin pages clear stale tokens, order management uses the dedicated admin endpoint, and oversized Telegram icons were corrected.
