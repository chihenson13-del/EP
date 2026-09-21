import { db } from "@/lib/db"

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

/** Creates the counter table if it isn't there yet (same shape as the Prisma model), so a fresh database just works. */
async function ensureTable(): Promise<void> {
  await db.$executeRaw`CREATE TABLE IF NOT EXISTS "RateLimit" ("key" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, "resetAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key"))`
  await db.$executeRaw`CREATE INDEX IF NOT EXISTS "RateLimit_resetAt_idx" ON "RateLimit"("resetAt")`
}

/** One atomic upsert: count this hit in the current window, starting a fresh window if the old one expired. */
async function recordHit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<{ count: number; retry: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}::int))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + make_interval(secs => ${windowSec}::int) ELSE "RateLimit"."resetAt" END
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("resetAt" - now()))))::int AS retry`
  // Housekeeping: now and then, drop windows that expired long ago.
  if (Math.random() < 0.01) void db.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < now() - interval '1 day'`.catch(() => {})
  const row = rows[0]
  return row && row.count > limit ? { ok: false, retryAfterSec: row.retry } : { ok: true }
}

/**
 * Fixed-window rate limiter backed by the database, so the limit holds across every serverless instance
 * (an in-memory counter would reset per instance). One round trip per check.
 *
 * Fails OPEN: if the limiter itself can't work, the request proceeds — the action it guards needs the
 * database anyway, and a hiccup must never lock legitimate people out.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  try {
    return await recordHit(key, limit, windowSec)
  } catch (error) {
    // First use on a database without the table: create it once and try again. Anything else fails open.
    if (!/RateLimit.*does not exist|relation .*RateLimit/i.test(String((error as Error)?.message))) return { ok: true }
    try {
      await ensureTable()
      return await recordHit(key, limit, windowSec)
    } catch {
      return { ok: true }
    }
  }
}

/** Forget a counter (e.g. after a successful sign-in, so a person isn't penalised for earlier typos). */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    await db.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${key}`
  } catch {
    /* best effort */
  }
}

/** The caller's IP address as seen by Vercel's edge (falls back to the standard proxy header). */
export function clientIp(headers: Headers): string {
  const raw = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "unknown"
  return raw.split(",")[0].trim() || "unknown"
}

export function waitMessage(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
  return `Too many attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`
}
