# BillFlow

Bank-connected financial automation: Plaid transactions, income rules, recurring bills, and a rule-based classifier.

**Database:** [Supabase](https://supabase.com) PostgreSQL via [Prisma](https://www.prisma.io/). The app uses **Prisma only** for data (no Supabase Auth SDK in the default flow).

## Environment variables (complete list)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | **Supabase Transaction pooler** URI (port `6543`, `pgbouncer=true`). Used by Prisma at runtime (e.g. Vercel serverless). |
| `DIRECT_URL` | Yes | **Supabase direct** Postgres URI (port `5432`). Used by `prisma migrate deploy` (migrations do not use PgBouncer). |
| `AUTH_SECRET` | Yes | JWT signing for session cookies (16+ characters). |
| `TOKEN_ENCRYPTION_KEY` | Yes | Encrypts Plaid access tokens at rest (16+ characters). |
| `PLAID_CLIENT_ID` | Yes | Plaid dashboard. |
| `PLAID_SECRET` | Yes | Plaid dashboard (sandbox or production). |
| `PLAID_ENV` | Yes | `sandbox`, `development`, or `production`. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public site URL (`http://localhost:3000` locally, `https://…vercel.app` in production). |

Optional (only if you later add `@supabase/supabase-js` for Storage/Realtime): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. They are **not** used by the current codebase.

Copy `.env.example` to `.env` and fill every **Required** row.

## Supabase setup (step by step)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database**
3. **Connection string** → **URI**:
   - **`DATABASE_URL`:** choose **Transaction pooler** (or “Pooler”, port **6543**). Ensure the query string includes `pgbouncer=true` if the dashboard does not add it.
   - **`DIRECT_URL`:** use **Session pooler** or **Direct connection** (port **5432**). This is the URL `prisma migrate deploy` uses.
4. Replace `[YOUR-PASSWORD]` in the copied strings with your database password (same screen: **Database password** / reset if needed).
5. Locally: `npx prisma migrate deploy` then `npm run dev`.
6. **Vercel:** add the same variables for **Production** (and **Preview** if you use preview deployments). `vercel.json` runs migrations on each production build.

## Local development

1. `.env` with Supabase `DATABASE_URL`, `DIRECT_URL`, and the rest (see `.env.example`).
2. `npm install`
3. `npx prisma migrate deploy`
4. `npm run dev`

## Why the login page can “work” with no database

- **`/login` is just a page** until you submit the form.
- **`POST /api/auth/login`** uses Prisma → needs valid `DATABASE_URL` / `DIRECT_URL` and applied migrations.
- **Middleware** needs `AUTH_SECRET` for `/dashboard`.

## Deploy on Vercel

1. Supabase project created and both connection strings copied.
2. Vercel project linked to this repo.
3. **Settings → Environment Variables:** set all variables in the table above (same values as local, except `NEXT_PUBLIC_APP_URL` = your production URL).
4. Deploy. **`vercel.json`** runs `prisma migrate deploy` before `next build`, so the schema is applied when env vars are present.

If you ever need a build **without** migrating, temporarily remove or override **Build Command** in the Vercel project settings (default override wins over `vercel.json` in some setups—check Vercel docs for your team).

## Plaid

Use sandbox keys for testing. For production, complete Plaid’s go-live steps and set `PLAID_ENV` accordingly.
