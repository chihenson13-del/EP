# Events Partner

All-in-one event planning platform — invitations, RSVPs, guest management, seating, event websites, communication, and event-day check-in, for any kind of event (not just weddings).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) — email/password, Google, Facebook
- Resend (email) / Twilio-compatible REST API (SMS) — both run in clearly-labeled **mock mode** until configured

## 1. Install dependencies

```bash
npm install
```

## 2. Set up the database

**Fastest path — zero install, no accounts:** this repo bundles a real, local Postgres cluster
(no Docker, no admin rights) via the `embedded-postgres` package. In one terminal:

```bash
npm run db:local
```

Leave that running — it prints the `DATABASE_URL` to paste into `.env` (defaults to
`postgresql://postgres:postgres@localhost:5433/events_partner?schema=public`, already set in `.env`).
Data persists under `.pgdata/` (gitignored) across restarts. Stop it with Ctrl+C.

**Alternatively**, use any other PostgreSQL database — a system install, Docker, or a free hosted
instance ([Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app)) —
and set `DATABASE_URL` in `.env` to point at it instead.

Either way, then push the schema and seed the plans + starter theme library:

```bash
npm run db:push
npm run db:seed
```

(`db:push` is fine for getting started; switch to `npm run db:migrate` once you want tracked migration history.)

## 3. Run it

```bash
npm run dev
```

Open http://localhost:3000. Register the account whose email matches `ADMIN_BOOTSTRAP_EMAIL` in `.env` to get admin access at `/admin`.

## Optional integrations

All of these are optional — the app is fully functional without them, just in mock/local mode:

| Feature | Env vars | Without it |
|---|---|---|
| Google login | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Button is hidden |
| Facebook login | `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` | Button is hidden |
| Real email delivery | `RESEND_API_KEY` | Emails log to the server console in **MOCK EMAIL MODE** |
| Real SMS delivery | `SMS_PROVIDER_ACCOUNT_SID`, `SMS_PROVIDER_AUTH_TOKEN`, `SMS_PROVIDER_FROM_NUMBER` | SMS logs to the console in **MOCK SMS MODE** |

## Project structure

```
prisma/schema.prisma     Data model (events, guests, RSVP, seating, payments, entitlements...)
prisma/seed.ts           Seeds Plan rows + the theme library
src/actions/             Server actions (mutations) — the app's business logic
src/app/                 Routes (dashboard, public event pages, admin, auth, API)
src/components/          UI, organized by feature area
src/lib/                 Shared logic: entitlements engine, event-type config, seating math, etc.
```

## How entitlements work

`src/lib/entitlements.ts` is the single source of truth for what a plan unlocks. It always re-derives
the effective plan from the `Purchase`/`Entitlement` tables server-side — nothing is trusted from the client.
Payments are submitted by customers, reviewed by an admin at `/admin/payments` (or auto-approved via
**Test payment mode**, admin-only), and only an `APPROVED` purchase activates an entitlement.

## Known scope notes

- **Image storage**: uploads (gallery, logos, invitation images) are stored as data URLs directly in
  Postgres for simplicity. For production, swap `src/components/shared/image-upload.tsx` to upload to
  S3/Cloudinary/etc. and store the resulting CDN URL instead — nothing downstream needs to change.
- **Scheduled messages**: a scheduled email/SMS is stored with `status: SCHEDULED`; wire up a cron job
  or queue to actually dispatch them at their `scheduledFor` time in production.
- **Households/groups**: the `GuestGroup` data model exists but has no dedicated UI yet — guests can be
  informally grouped today via the `category` field.
