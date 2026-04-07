# BillFlow

Bank-connected financial automation: Plaid transactions, income rules, recurring bills, and a rule-based classifier.

## Local development

1. Copy `.env.example` to `.env` and set variables (PostgreSQL URL, `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, Plaid keys).
2. `npm install`
3. `npx prisma migrate deploy` (applies migrations to your database)
4. `npm run dev`

## Deploy on Vercel

1. Create a **PostgreSQL** database (e.g. [Neon](https://neon.tech)) and copy the connection string.
2. Push this repo to GitHub and **Import** the project in [Vercel](https://vercel.com).
3. In Vercel → Project → **Settings → Environment Variables**, add:
   - `DATABASE_URL` — Postgres connection string (with `sslmode=require` if required)
   - `AUTH_SECRET` — long random string (16+ characters)
   - `TOKEN_ENCRYPTION_KEY` — long random string (16+ characters)
   - `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
   - `NEXT_PUBLIC_APP_URL` — your production URL (e.g. `https://<project>.vercel.app`)
4. Redeploy. The build runs `prisma migrate deploy` then `next build`.

## Plaid

Use sandbox keys for testing. For production, complete Plaid’s go-live steps and set `PLAID_ENV` accordingly.
