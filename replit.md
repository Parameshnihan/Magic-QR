# Advento Magic QR

A production-ready SaaS web application for reputation management and Google review automation. Helps agencies onboard clients, manage Google review funnels via QR codes, track scan analytics, handle negative feedback privately, and manage subscription billing — all from a premium luxury-hospitality-inspired dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/review-flow-pro run dev` — run the frontend (Vite, port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — seed the database with demo data
- Required env: `DATABASE_URL` — Postgres connection string

## Demo Credentials (after seeding)

- **Super Admin**: admin@reviewflowpro.com / admin123
- **Manager**: sarah@reviewflowpro.com / manager123
- **Manager**: james@reviewflowpro.com / manager123

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Wouter routing + shadcn/ui + Recharts + Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Auth: Token-based (base64 encoded userId:timestamp:secret), stored in localStorage as `rfp_token`
- Build: esbuild (CJS bundle for API), Vite (frontend)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `lib/api-client-react/src/custom-fetch.ts` — Custom fetch implementation with auth token getter
- `lib/api-zod/src/generated/api.ts` — Generated Zod validation schemas
- `lib/db/src/schema/` — Drizzle ORM schema files (11 tables)
- `lib/db/src/seed.ts` — Database seed script with 6 clients + full demo data
- `artifacts/api-server/src/routes/` — All Express route handlers
- `artifacts/review-flow-pro/src/pages/` — All frontend pages (18 pages)
- `artifacts/review-flow-pro/src/lib/auth.tsx` — Auth context + setAuthTokenGetter wiring
- `artifacts/review-flow-pro/src/components/layout.tsx` — Sidebar layout component

## Architecture decisions

- **Contract-first API**: OpenAPI spec defines the API; Orval generates type-safe React Query hooks and Zod schemas. Never write raw fetch calls in the frontend.
- **Token auth via setAuthTokenGetter**: Auth token is stored in localStorage as `rfp_token`. The `AuthProvider` calls `setAuthTokenGetter` on mount so all generated hooks automatically include the `Authorization: Bearer` header.
- **DB schema as text for dates**: Renewal/subscription dates are stored as `text` (ISO 8601 strings, `YYYY-MM-DD`) rather than timestamp — avoids timezone complexity for billing date math.
- **Public review flow is standalone**: The `/review/:qrCode` page has no sidebar layout and is mobile-first — it's the end-user-facing funnel, not an internal admin page.
- **Analytics uses DB aggregations + mock trend data**: Real-time counts come from the DB; time-series charts (scans/reviews over time) use server-generated random sequences until a time-series table is added.

## Product

**Advento Magic QR** is a SaaS platform for agencies and multi-location businesses to automate Google review generation. Core features:
- **Client CRM**: Onboard clients with full business profile, logo, Google review link, subscription plan, and assigned manager
- **QR Campaign Manager**: Generate QR codes for each client/location; scans route customers to a review flow
- **Review Funnel**: 4-5 star ratings → keyword-assisted review text → Google redirect; 1-3 stars → private feedback form (never hits Google)
- **Feedback Inbox**: Negative feedback captured with priority levels (urgent/high/medium/low), status tracking, and notification alerts
- **Billing**: Subscription management (basic $99/mo, professional $299/mo, enterprise $599/mo) with invoice tracking
- **Analytics**: Dashboard KPIs, scan trends, review trends, rating distribution, device breakdown, revenue charts, top clients leaderboard
- **Notifications**: Real-time alerts for new reviews, negative feedback, overdue invoices, expiring subscriptions
- **Audit Logs**: Full activity trail for compliance and debugging
- **Settings**: Platform branding, SMTP, WhatsApp API, Stripe/Razorpay, Google API configuration

## Brand

- Background: #F3EFEC (soft warm beige)
- Sidebar: #120700 (deep espresso)
- Primary: #8B4A1F (warm brown)
- Secondary text: #7A6F68
- Borders: #E5DFDA

## User preferences

- Brand colors are exact — do not change the hex values
- No emojis in the UI
- Premium luxury-hospitality tone throughout

## Gotchas

- **Always run codegen after changing openapi.yaml**: `pnpm --filter @workspace/api-spec run codegen` — the index.ts overwrite step is critical (see orval config)
- **DB dates are text**: All `renewalDate`, `startDate`, `endDate` columns are `text` type — pass ISO date strings, not Date objects
- **nanoid catalog entry**: nanoid@^5.1.11 is in the pnpm catalog — use `"nanoid": "catalog:"` in any new package that needs it
- **Analytics SQL**: The `subscriptions.end_date` is a text column — use JavaScript string comparison, not PostgreSQL `interval` syntax
- **setAuthTokenGetter must be called in AuthProvider**: Without it, all API calls from the generated hooks will be missing the Authorization header

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for all available endpoints
- See `lib/db/src/schema/index.ts` for all database table definitions
