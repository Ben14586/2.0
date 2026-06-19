# Game Services Project Map

## Runtime Files

- `server.py`: Python backend, API routes, static serving, uploads, order flow, Netlify export helpers.
- `index.html`: public storefront and landing page.
- `admin.html`: local/admin operations UI.
- `runtime-config.js`: generated frontend API endpoint config for static deploys.
- `Dockerfile`, `.dockerignore`, `Procfile`: backend deployment entry files.
- `database.db`: live local data. Preserve it.
- `uploads/`: uploaded slips/images/evidence. Preserve it.

## React And Styling

- `frontend/entry.tsx`: React island mount point.
- `components/blocks/features-10.tsx`: upgraded service system section.
- `components/ui/`: local shadcn-style primitives.
- `lib/utils.ts`: class merge helper.
- `vite.config.ts`: frontend build inputs and static base.
- `tailwind.config.js`: Tailwind scan paths and theme.

## Tools

- `tools/build_frontend.py`: robust frontend build runner.
- `tools/export_static.py`: creates static deploy zip.
- `tools/export_excel.py`: creates the latest operations workbook.
- `tools/sync_game_media.py`: fills game image and Play Store data from the reference catalog.
- `tools/cache_game_media.py`: downloads active game images into local `uploads/game-images/`.
- `tools/qa_check.py`: project regression checks.
- `tools/smoke_test.py`: backend/API smoke checks.
- `tools/package_backend.py`: backend hosting package.
- `docs/backend-deploy-checklist.md`: operator checklist for Render/Railway backend deployment.
- `tools/configure_backend.py`: writes backend URL config.
- `tools/phase3_preflight.py`: online deploy readiness check.
- `tools/phase3_build.py`: phase 3 packaging/build flow.
- `tools/phase4_order_uat.py`: order flow UAT.

## Main Commands

```powershell
npm run build
npm run sync:media
npm run cache:media
npm run export:static
npm run export:excel
npm run qa
npm run smoke
npm run phase4:uat
npm run package:backend
```

## Deployment Artifacts

- `netlify-deploy-latest.zip`: upload this to Netlify for the static public site.
- `backend-deploy-latest.zip`: upload/deploy this to a Python backend host such as Render or Railway.
  - Must include `uploads/game-images/`.
  - Must exclude `database.db` and private slip uploads.

## Production Reminder

Netlify alone cannot create real online orders unless the site points to a hosted backend. After deploying the backend, configure and rebuild:

```powershell
npm run go-live:connect -- https://your-backend.example.com
```
