# Implementation status

## Implemented in this starter
- Premium responsive landing page
- Registration that creates a user, organization, owner membership, starter categories, main location and free subscription record in one transaction
- Credentials login with bcrypt password verification
- Organization-scoped asset list/create/read/update/delete API handlers and server-side role checks
- Dashboard overview and searchable/filterable/paginated asset list
- Asset create and edit forms with Zod validation, quantity checks and category/location selection
- Category and location management screens with organization-scoped CRUD APIs
- Active workspace selection through a membership-validated httpOnly cookie and dashboard switcher
- Condition quick actions and a role-gated delete confirmation dialog on the asset detail page
- Check-out/check-in APIs, assignment history and check-out form on the asset detail page
- Maintenance APIs, create/edit forms, history and admin-only record deletion
- Installable PWA: manifest, generated icons, install prompt, service worker and offline fallback (no authenticated data cached)
- Asset detail page with audit history, assignment/maintenance history display
- Transactional create/update/delete audit records and analytics events
- Organization-scoped unique asset tags and serial numbers
- QR generation and downloadable PNG; public QR page defaults to disabled
- PostgreSQL schema for organizations, memberships, assets, categories, locations, assignments, maintenance, audit, tags, subscriptions, orders and analytics

## Not yet implemented / needs verification
- Asset bulk actions
- Team invitations and a create-workspace flow for joining additional organizations
- Email verification, password reset, invitation emails, rate limiting and automated security tests
- XLSX/CSV import/export, report charts, depreciation estimates, notification delivery
- PDF label sheets, NFC programming, physical tag ordering
- Payment provider integration and verified webhooks
- Admin panel, configurable plans/limits and complete billing lifecycle
- File uploads/object storage, data export/deletion workflows, localization, light mode toggle
- PostgreSQL-level immutable audit enforcement

This status is intentionally explicit: no external payment, email, storage or notification service has been falsely represented as integrated.
