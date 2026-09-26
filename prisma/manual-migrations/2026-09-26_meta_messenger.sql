-- Official Meta Messenger integration tables (feature stays DISABLED until META_MESSENGER_ENABLED=true + Meta approval).
-- Purely additive: new enum types and new tables only. No existing table or column is changed.
-- Safe to run more than once. Run BEFORE deploying code that reads these tables.

DO $$ BEGIN
  CREATE TYPE "MetaConnectionStatus" AS ENUM ('PENDING_PAGE', 'CONNECTED', 'NEEDS_RECONNECT', 'DISCONNECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MessengerMessageStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'UNAVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MetaConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "MetaConnectionStatus" NOT NULL DEFAULT 'PENDING_PAGE',
  "metaUserId" TEXT,
  "pageId" TEXT,
  "pageName" TEXT,
  "pageAccessTokenEnc" TEXT,
  "pendingPagesEnc" TEXT,
  "pendingExpiresAt" TIMESTAMP(3),
  "connectedAt" TIMESTAMP(3),
  "lastWebhookAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MetaConnection_userId_key" ON "MetaConnection"("userId");
CREATE INDEX IF NOT EXISTS "MetaConnection_pageId_idx" ON "MetaConnection"("pageId");
CREATE INDEX IF NOT EXISTS "MetaConnection_metaUserId_idx" ON "MetaConnection"("metaUserId");

CREATE TABLE IF NOT EXISTS "MessengerRecipient" (
  "id" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "psid" TEXT NOT NULL,
  "optInSource" TEXT NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastInboundAt" TIMESTAMP(3),
  CONSTRAINT "MessengerRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MessengerRecipient_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MessengerRecipient_guestId_key" ON "MessengerRecipient"("guestId");
CREATE UNIQUE INDEX IF NOT EXISTS "MessengerRecipient_pageId_psid_key" ON "MessengerRecipient"("pageId", "psid");
CREATE INDEX IF NOT EXISTS "MessengerRecipient_ownerId_idx" ON "MessengerRecipient"("ownerId");

CREATE TABLE IF NOT EXISTS "MessengerMessage" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "metaMessageId" TEXT,
  "status" "MessengerMessageStatus" NOT NULL DEFAULT 'SENDING',
  "text" TEXT NOT NULL,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  CONSTRAINT "MessengerMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MessengerMessage_idempotencyKey_key" ON "MessengerMessage"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "MessengerMessage_metaMessageId_key" ON "MessengerMessage"("metaMessageId");
CREATE INDEX IF NOT EXISTS "MessengerMessage_ownerId_eventId_idx" ON "MessengerMessage"("ownerId", "eventId");
CREATE INDEX IF NOT EXISTS "MessengerMessage_guestId_idx" ON "MessengerMessage"("guestId");

CREATE TABLE IF NOT EXISTS "MetaWebhookEvent" (
  "key" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaWebhookEvent_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "MetaWebhookEvent_receivedAt_idx" ON "MetaWebhookEvent"("receivedAt");

CREATE TABLE IF NOT EXISTS "MetaDataDeletionRequest" (
  "confirmationCode" TEXT NOT NULL,
  "metaUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaDataDeletionRequest_pkey" PRIMARY KEY ("confirmationCode")
);
