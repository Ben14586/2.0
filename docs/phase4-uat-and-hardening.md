# Phase 4 UAT And Hardening

## Objective

Confirm the real sales flow works end to end before public promotion:

customer selects package -> order is created as `ORD-...` -> admin sees it -> admin updates status -> customer can track it.

## Local Dry Run

This does not create an order:

```bash
npm run phase4:uat
```

## Local Real Order Test

This creates one test order in the connected backend:

```bash
npm run phase4:uat:create
```

If admin credentials are available and you want the test order cancelled immediately:

```bash
python tools/phase4_order_uat.py --create --cancel
```

## Online Backend Test

After backend deployment:

```bash
npm run phase4:uat -- --base-url https://your-backend-host.example.com
```

Create a real test order:

```bash
npm run phase4:uat:create -- --base-url https://your-backend-host.example.com
```

## Manual Browser UAT

1. Open the Netlify storefront.
2. Choose one game.
3. Choose one package.
4. Upload a valid image as a test slip.
5. Confirm the order.
6. The order ID must start with `ORD-`, not `WEB-`.
7. Open admin.
8. Verify the order appears in latest orders.
9. Change status to `processing`.
10. Search the order ID in the storefront tracking box.
11. Change status to `completed` only for a safe test order.

## Admin Hardening Checklist

- Change the admin password before public launch.
- Keep `ADMIN_KEY` blank unless you need emergency API access.
- Keep `COOKIE_SECURE=1` and `COOKIE_SAMESITE=None` on HTTPS production.
- Keep `ALLOWED_ORIGINS` limited to the Netlify domain.
- Download a database backup before and after the first real order.
- Do not promote the site until `/health`, smoke test, and Phase 4 UAT all pass.

## Go / No-Go

Go live only if:

- `npm run qa` passes.
- `npm run smoke -- --base-url <backend>` passes.
- `npm run phase4:uat -- --base-url <backend>` passes.
- A browser test creates an `ORD-...` order.
- Admin can update status.
- Public tracking can read the status.
- Backup download works.

No-go if:

- Orders create `WEB-...` on Netlify after backend config.
- Admin cannot see new orders.
- Slip upload fails for valid PNG/JPG/WebP.
- Tracking cannot find a newly created order.
