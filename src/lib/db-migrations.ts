import { db } from "@/lib/db"

/**
 * Database updates an admin can apply from Admin → Settings, for a project that has no migration CLI step in its
 * deploy. Rules for every entry:
 *   - ADDITIVE ONLY: new tables, new nullable columns, new indexes, new enum types. Never drop, rename or rewrite data
 *     (filling a column that the same update just created is allowed).
 *   - IDEMPOTENT: every statement uses IF NOT EXISTS / duplicate_object guards, so re-running is harmless.
 *   - FIXED SQL: statements are constants in this file; nothing from a request ever reaches the SQL.
 * Applied IDs are recorded in "_AppMigration". Keep prisma/schema.prisma in sync with what is listed here.
 */
export type AppMigration = { id: string; description: string; statements: string[] }

export const APP_MIGRATIONS: AppMigration[] = [
  {
    id: "2026-09-26_guest_facebook_profile_url",
    description: "Guests: optional Facebook Profile link (new empty column; existing guests unchanged).",
    statements: [`ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "facebookProfileUrl" TEXT`],
  },
  {
    id: "2026-09-26_meta_messenger",
    description: "Official Meta Messenger integration tables (new tables only; the integration stays switched off).",
    statements: [
      `DO $$ BEGIN CREATE TYPE "MetaConnectionStatus" AS ENUM ('PENDING_PAGE', 'CONNECTED', 'NEEDS_RECONNECT', 'DISCONNECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "MessengerMessageStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'UNAVAILABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `CREATE TABLE IF NOT EXISTS "MetaConnection" (
        "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "status" "MetaConnectionStatus" NOT NULL DEFAULT 'PENDING_PAGE',
        "metaUserId" TEXT, "pageId" TEXT, "pageName" TEXT, "pageAccessTokenEnc" TEXT, "pendingPagesEnc" TEXT,
        "pendingExpiresAt" TIMESTAMP(3), "connectedAt" TIMESTAMP(3), "lastWebhookAt" TIMESTAMP(3), "lastError" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "MetaConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MetaConnection_userId_key" ON "MetaConnection"("userId")`,
      `CREATE INDEX IF NOT EXISTS "MetaConnection_pageId_idx" ON "MetaConnection"("pageId")`,
      `CREATE INDEX IF NOT EXISTS "MetaConnection_metaUserId_idx" ON "MetaConnection"("metaUserId")`,
      `CREATE TABLE IF NOT EXISTS "MessengerRecipient" (
        "id" TEXT NOT NULL, "guestId" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "pageId" TEXT NOT NULL, "psid" TEXT NOT NULL,
        "optInSource" TEXT NOT NULL, "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastInboundAt" TIMESTAMP(3),
        CONSTRAINT "MessengerRecipient_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "MessengerRecipient_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MessengerRecipient_guestId_key" ON "MessengerRecipient"("guestId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MessengerRecipient_pageId_psid_key" ON "MessengerRecipient"("pageId", "psid")`,
      `CREATE INDEX IF NOT EXISTS "MessengerRecipient_ownerId_idx" ON "MessengerRecipient"("ownerId")`,
      `CREATE TABLE IF NOT EXISTS "MessengerMessage" (
        "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "eventId" TEXT NOT NULL, "guestId" TEXT NOT NULL, "pageId" TEXT NOT NULL,
        "idempotencyKey" TEXT NOT NULL, "metaMessageId" TEXT, "status" "MessengerMessageStatus" NOT NULL DEFAULT 'SENDING',
        "text" TEXT NOT NULL, "errorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "sentAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "readAt" TIMESTAMP(3),
        CONSTRAINT "MessengerMessage_pkey" PRIMARY KEY ("id"))`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MessengerMessage_idempotencyKey_key" ON "MessengerMessage"("idempotencyKey")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MessengerMessage_metaMessageId_key" ON "MessengerMessage"("metaMessageId")`,
      `CREATE INDEX IF NOT EXISTS "MessengerMessage_ownerId_eventId_idx" ON "MessengerMessage"("ownerId", "eventId")`,
      `CREATE INDEX IF NOT EXISTS "MessengerMessage_guestId_idx" ON "MessengerMessage"("guestId")`,
      `CREATE TABLE IF NOT EXISTS "MetaWebhookEvent" (
        "key" TEXT NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MetaWebhookEvent_pkey" PRIMARY KEY ("key"))`,
      `CREATE INDEX IF NOT EXISTS "MetaWebhookEvent_receivedAt_idx" ON "MetaWebhookEvent"("receivedAt")`,
      `CREATE TABLE IF NOT EXISTS "MetaDataDeletionRequest" (
        "confirmationCode" TEXT NOT NULL, "metaUserId" TEXT NOT NULL, "status" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MetaDataDeletionRequest_pkey" PRIMARY KEY ("confirmationCode"))`,
    ],
  },
  {
    id: "2026-09-26_guest_rsvp_response_fields",
    description: "RSVP responses: the answer a guest picked, their message to the host, and when they first responded (new empty columns).",
    statements: [
      `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "rsvpAnswer" TEXT`,
      `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "rsvpMessage" TEXT`,
      `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "rsvpFirstRespondedAt" TIMESTAMP(3)`,
      // Guests who already answered: their first response time is the response time we have.
      `UPDATE "Guest" SET "rsvpFirstRespondedAt" = "respondedAt" WHERE "rsvpFirstRespondedAt" IS NULL AND "respondedAt" IS NOT NULL`,
    ],
  },
]

async function ensureLedger(): Promise<void> {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_AppMigration" ("id" TEXT NOT NULL PRIMARY KEY, "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
}

export async function getMigrationStatus(): Promise<Array<{ id: string; description: string; appliedAt: string | null }>> {
  await ensureLedger()
  const rows = await db.$queryRawUnsafe<Array<{ id: string; appliedAt: Date }>>(`SELECT "id", "appliedAt" FROM "_AppMigration"`)
  const applied = new Map(rows.map((r) => [r.id, r.appliedAt]))
  return APP_MIGRATIONS.map((m) => ({ id: m.id, description: m.description, appliedAt: applied.get(m.id)?.toISOString() ?? null }))
}

/** Applies every pending migration in order, each in its own transaction. Stops at the first failure. */
export async function applyPendingMigrations(): Promise<{ applied: string[]; error?: string }> {
  await ensureLedger()
  const done = new Set((await db.$queryRawUnsafe<Array<{ id: string }>>(`SELECT "id" FROM "_AppMigration"`)).map((r) => r.id))
  const applied: string[] = []
  for (const migration of APP_MIGRATIONS) {
    if (done.has(migration.id)) continue
    try {
      await db.$transaction(async (tx) => {
        for (const statement of migration.statements) await tx.$executeRawUnsafe(statement)
        await tx.$executeRaw`INSERT INTO "_AppMigration" ("id") VALUES (${migration.id}) ON CONFLICT ("id") DO NOTHING`
      }, { timeout: 30_000 })
      applied.push(migration.id)
    } catch (error) {
      return { applied, error: `${migration.id}: ${error instanceof Error ? error.message.slice(0, 300) : "failed"}` }
    }
  }
  return { applied }
}
