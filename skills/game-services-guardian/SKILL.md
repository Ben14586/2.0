---
name: game-services-guardian
description: Maintain and upgrade this Game Services storefront/backend safely. Use when working on the landing page, admin/order flow, React/Tailwind/shadcn UI, Netlify export, backend deployment, QA checks, cleanup, or regression prevention in this project.
---

# Game Services Guardian

## Purpose

Use this skill as the project guardian for the Game Services website. It keeps changes practical, production-minded, and hard to break: public storefront, admin panel, order flow, slip checks, static Netlify export, backend package, and QA must stay aligned.

## Non-Negotiables

- Never delete or reset live data files unless the user explicitly asks: `database.db`, `uploads/`, `.env`, local payment/order evidence, and user-provided source files.
- Do not re-enable hidden/disabled games just because old data exists. In particular, do not recheck or resurrect `HEAVENFALL ARENA` unless the user asks for it.
- Do not wipe deployment folders or logs as a default habit. Clean only stale build artifacts needed for the current export.
- Every frontend change that affects the live site must end with a fresh `netlify-deploy-latest.zip`.
- Backend deployment changes must end with a fresh `backend-deploy-latest.zip`.
- Keep operations data exportable to Excel through the admin page and `npm run export:excel`.
- Keep active game cards visual. Use `npm run sync:media` when game image/Play Store metadata is missing, then `npm run cache:media` before deploy so active game images are local and stable.
- Keep backend fresh deploys self-healing: curated games should seed their `catalog_type`, `reference_title`, local `play_image`, and Play Store link without requiring the local `database.db`.
- Preserve order creation, order number display, admin edits, package visibility, uploaded slip handling, and contact handoff behavior.
- Remove unused files only after confirming with `rg` that no runtime path, build script, or export process still references them.

## First Look

Start by reading the current shape of the project, not by guessing.

1. Inspect `package.json` for scripts and dependencies.
2. Inspect `server.py` for backend routes, export behavior, static serving, and upload/order logic.
3. Inspect `index.html` and `admin.html` for user-facing and admin flows.
4. Inspect `tools/qa_check.py` before changing QA expectations.
5. Use `rg` or `rg --files` first for search.

If the task touches the React upgrade area, also inspect:

- `frontend/entry.tsx`
- `components/blocks/features-10.tsx`
- `components/ui/`
- `vite.config.ts`
- `tailwind.config.js`

## Change Workflow

1. Define the smallest safe scope.
2. Confirm whether the change touches frontend only, backend only, data/admin behavior, or deployment packaging.
3. Edit using existing patterns. Prefer current Python backend, static HTML, React island, Tailwind, and shadcn-style components already present.
4. Keep visual changes responsive and practical for Thai text. Watch line breaks, button overflow, select contrast, and card spacing.
5. After edits, run the smallest meaningful validation set, then broaden if the change touched shared behavior.
6. Export or package only what the change requires.

## Frontend Rules

- Public landing starts from `index.html`.
- Admin starts from `admin.html`.
- React/Tailwind upgrade island mounts through `frontend/entry.tsx` into `#react-upgrade-root`.
- shadcn-style UI lives under `components/ui/`; keep it minimal and local.
- Do not add decorative frameworks or animation libraries unless the feature truly needs them.
- The Netlify zip must contain built assets such as `assets/*.js`; it must not rely on raw `frontend/entry.tsx`.
- Avoid adding tutorial, wallet, or unused public sections the user already removed.

## Backend And Data Rules

- `server.py` is the canonical backend and static export source.
- Keep API behavior compatible with the admin panel and public order flow.
- Online order creation needs a real backend host URL configured in `runtime-config.js`.
- Static Netlify export is for the public frontend bundle; dynamic orders need the backend package hosted separately.
- Backend packages should include deploy entry files (`Dockerfile`, `Procfile`, Render/Railway config) and public game media under `uploads/game-images/`.
- Backend packages must not include the live SQLite database or private slip uploads.
- If order flow changes, verify that the final screen shows product details, order number, and contact options instead of jumping away too early.

## Validation Commands

Run the relevant commands from the project root.

```powershell
npm run build
npm run sync:media
npm run cache:media
npm run export:static
npm run export:excel
npm run qa
npm run smoke
```

Use these when the related area changed:

```powershell
npm run phase4:uat
npm run package:backend
npm run phase3:preflight
```

For a real backend URL after hosting:

```powershell
npm run go-live:connect -- https://your-backend.example.com
```

## Deployment Checklist

Before telling the user the work is ready:

- `npm run build` passes when frontend/build config changed.
- `npm run export:static` passes when public site changed.
- `netlify-deploy-latest.zip` exists and is fresh after public site changes.
- `npm run qa` passes after meaningful website or deploy changes.
- Active games have local gameplay/Play Store preview images and are not falling back to initials unless no official image is available.
- `npm run export:excel` works after order, game, package, coupon, or slip data structures change.
- `npm run smoke` passes after backend/API/order-sensitive changes.
- `npm run phase4:uat` runs when order creation or checkout behavior changed.
- `npm run package:backend` runs when backend hosting files changed.
- Backend zip contains `uploads/game-images/` and excludes `database.db` and private slip uploads.
- Mention any command that was not run and why.

## Cleanup Checklist

- Search before removal: `rg "name-or-path"`.
- Keep only files used by runtime, build, docs, deploy, QA, or active project skills.
- Do not remove `dist/` if it is being used by backend static serving or the current export process.
- Do not remove `netlify-deploy-latest.zip` after a site change; that is the user's deploy artifact.
- Do not expose secrets from `.env` or admin credentials in final messages.

## Project Map

For a compact file map and command reference, read `references/project-map.md`.
