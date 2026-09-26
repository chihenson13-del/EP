-- Guest.facebookProfileUrl: optional Facebook profile / Messenger link for the "Message on Facebook" shortcut.
-- Additive and nullable: existing guests get NULL, nothing else changes. Safe to run more than once.
-- This project applies schema changes with `prisma db push` / SQL (there is no prisma/migrations history),
-- so run this against the production database BEFORE deploying code that reads the column.
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "facebookProfileUrl" TEXT;
