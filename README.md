# BillFlow

Bank-connected financial automation: Plaid transactions, income rules, recurring bills, and a rule-based classifier.

## Local development

1. Copy `.env.example` to `.env` and set variables (PostgreSQL URL, `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, Plaid keys).
2. `npm install`
3. `npx prisma migrate deploy` (applies migrations to your database)
4. `npm run dev`

## Deploy on Vercel

1. Create a **PostgreSQL** database (e.g. [Neon](https://neon.tech)) and copy the connection string.
2. Import this repo in [Vercel](https://vercel.com) (GitHub is already connected if you used the CLI).
3. In Vercel → Project → **Settings → Environment Variables** (Production + Preview), add:
   - `DATABASE_URL` — Postgres connection string (often append `?sslmode=require`)
   - `AUTH_SECRET` — long random string (16+ characters)
   - `TOKEN_ENCRYPTION_KEY` — long random string (16+ characters)
   - `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
   - `NEXT_PUBLIC_APP_URL` — your production URL (e.g. `https://billflow.vercel.app`)
4. **Apply database schema** (pick one):
   - **Option A:** In Vercel → **Settings → General → Build & Development Settings**, set **Build Command** to `npm run build:migrate` (runs `prisma migrate deploy` then the normal build). Redeploy.
   - **Option B:** From your machine, with `DATABASE_URL` pointing at the same database: `npx prisma migrate deploy`
5. Redeploy if you changed the build command or env vars.

The default `npm run build` only runs `prisma generate` + `next build` so the first deploy can succeed before `DATABASE_URL` exists; use **Option A** or **B** so tables are created.

## Plaid

Use sandbox keys for testing. For production, complete Plaid’s go-live steps and set `PLAID_ENV` accordingly.
