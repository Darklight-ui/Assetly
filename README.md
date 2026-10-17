# Assetly — Asset Inventory MVP

A Nigeria-first asset inventory starter built with Next.js App Router, TypeScript, Tailwind CSS v4, PostgreSQL, Prisma, Auth.js Credentials, Zod and QRCode. It includes the initial product architecture and working MVP paths for registration, sign-in, organization-scoped asset CRUD APIs, an inventory dashboard, audit records and QR code generation.

> **Production status:** this is an MVP starter, not a fully audited production SaaS. Email verification, password reset, rate limiting, file uploads, spreadsheet import/export, subscription checkout, admin operations, PDF label sheets, and legal/privacy workflows still need implementation and testing. Do not claim those features are live.

## Architecture

- **Web:** Next.js App Router and TypeScript; Tailwind CSS v4; server-rendered dashboard overview.
- **Auth:** Auth.js credentials provider with bcrypt password hashing and JWT session strategy. The initial organization membership is created transactionally during registration.
- **Data:** PostgreSQL + Prisma. Organization-scoped unique asset tags and serial numbers; indexes for common filters; audit rows created in the same transaction as asset writes.
- **QR tags:** QR code encodes a public HTTPS URL (`/tag/{opaque-token}`), never an app deep link. Public pages default to disabled and expose only explicitly approved fields.
- **PWA:** installable manifest, generated icons, install prompt and a service worker that caches only static assets plus an offline fallback. Authenticated dashboard HTML and API responses are never cached.
- **Payments/files:** adapter environment placeholders only; no payment or object-storage provider is represented as integrated.

## Requirements

- Node.js 20.9+
- PostgreSQL 15+ (local or managed)
- npm

## Run locally

1. Create a PostgreSQL database named `asset_inventory`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL`. Generate a secret with `openssl rand -base64 32`.
3. Install dependencies: `npm install`.
4. Generate Prisma Client: `npm run db:generate`.
5. Create and apply the first migration: `npm run db:migrate -- --name init`.
6. Start Next.js: `npm run dev`.
7. Open `http://localhost:3000`, register an account and create your organization.

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string. Use SSL and a least-privileged DB role in production.
- `AUTH_SECRET`: long random secret; never expose it to client code.
- `AUTH_URL`: canonical application URL for Auth.js (set to your deployed HTTPS URL in production).
- `NEXT_PUBLIC_APP_URL`: canonical base URL used to build QR destinations. Must be HTTPS in production.
- `OBJECT_STORAGE_*`: reserved for a future private object storage adapter; uploads are not implemented.
- `PAYMENT_PROVIDER_SECRET_KEY`: reserved integration point only; payments are not implemented.

## MVP routes

- `/`: marketing landing page
- `/register`, `/login`: account creation and login
- `/dashboard`: overview and workspace summary
- `/dashboard/assets`: searchable, filterable, paginated inventory list
- `/dashboard/assets/new`: validated asset creation form with category/location selection
- `/dashboard/assets/[id]`: asset detail, condition quick actions, check-out/check-in and maintenance forms
- `/dashboard/assets/[id]/edit`: validated asset edit form
- `/dashboard/categories`, `/dashboard/locations`: taxonomy management
- `/dashboard/tags`: QR generator and PNG download
- `GET/POST /api/assets`: list/create assets
- `GET/PATCH/DELETE /api/assets/[id]`: read/update/delete assets
- `GET/POST /api/categories`, `PATCH/DELETE /api/categories/[id]`: category management
- `GET/POST /api/locations`, `PATCH/DELETE /api/locations/[id]`: location management
- `POST /api/organization/active`: switch the active workspace (membership-validated)
- `GET/POST /api/assets/[id]/assignments`: assignment history and check-out
- `PATCH/DELETE /api/assignments/[id]`: check-in and record correction
- `GET/POST /api/assets/[id]/maintenance`: maintenance history and new records
- `PATCH/DELETE /api/maintenance/[id]`: update or remove maintenance records
- `GET /api/labels/[assetId]`: authenticated QR data URL generation
- `GET /api/public-assets/[token]`: token-based public data endpoint
- `/tag/[token]`: public-safe tag page, only when `publicEnabled` is true
- `/offline`: static offline fallback served by the service worker
- `/manifest.webmanifest`, `/sw.js`: PWA manifest and service worker

## PWA

Assetly is installable from supported browsers:

- `src/app/manifest.ts` defines the manifest served at `/manifest.webmanifest` (standalone display, theme colors and shortcuts to Assets, Add asset and QR labels).
- Icons live in `public/icons/` and are regenerated with `node scripts/generate-icons.mjs` (also wired to `predev`/`prebuild`, so `npm run dev` and `npm run build` regenerate them automatically). The script has no image dependencies; it rasterizes the brand mark and encodes the PNGs itself.
- `public/sw.js` precaches the offline page and icons, serves `/_next/static` and image assets cache-first, and falls back to `/offline` when a navigation fails.
- Authenticated dashboard HTML and `/api/*` responses are **never** cached, so inventory data cannot leak between accounts or on shared devices.
- The service worker registers only in production. In development it unregisters any existing worker so hot reload is never served stale content.
- The login page shows an **Install app** button when the browser fires `beforeinstallprompt` (Chromium-based browsers). On iOS Safari, use Share → Add to Home Screen.
- Installability requires HTTPS in production; `localhost` works for development.

## Security and data integrity notes

1. Asset APIs resolve the active organization from an httpOnly cookie and re-validate that membership on every request; an organization ID supplied by a browser is never trusted. The dashboard exposes an explicit workspace selector. Keep this validation when adding team invitations or cross-organization reporting.
2. Role checks are enforced in API handlers. Expand permission tests before adding team invitations or bulk operations.
3. Asset tag and serial number uniqueness is scoped to an organization. PostgreSQL permits multiple `NULL` serial numbers under the unique constraint.
4. Audit events are written transactionally with create/update/delete. For strong immutability, use a separate DB role that cannot update/delete audit rows and add PostgreSQL triggers/policies; app-level append-only conventions alone are not a security boundary.
5. Add rate limiting (for example at the reverse proxy or a shared Redis-backed limiter), email verification, password reset, CSRF/security review, account deletion/export, and automated tests before production.
6. Public tag records expose only name, asset tag, condition and a specifically entered public description. Never add serial numbers, custodian names, internal notes, purchase cost or exact room details to the public response by default.
7. File storage and payments are not integrated. Do not store uploads in a public bucket or mark orders paid without verified provider webhooks.
8. Use HTTPS, secure headers, database backups, migration review and monitoring in deployment.

## Recommended next build order

1. Add CSV import preview/confirm and filtered export.
2. Generate A4/Letter PDF label sheets and print layouts.
3. Add email verification/password reset, rate limiting, test coverage and security review.
4. Add object storage, then a real Nigerian payment provider integration with verified webhooks.
5. Add team invites, role management, reports, plan limits and platform administration.

## Deployment

Deploy the Next.js application to a Node-compatible hosting platform and PostgreSQL to a managed database. Configure the environment variables in the hosting dashboard, run `npm run db:deploy` as a release step, and set both `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the canonical HTTPS domain. Never commit `.env`. Test signup, login, tenant isolation, asset CRUD, duplicate tags, public-disabled QR links and database restoration before launch.
