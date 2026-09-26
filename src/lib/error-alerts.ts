import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/mailer"
import { escapeHtml } from "@/lib/email-templates"
import { rateLimit } from "@/lib/rate-limit"
import { SITE_URL } from "@/lib/site"
import { fingerprintOf, sanitizePath, type ErrorSource } from "@/lib/error-fingerprint"

/**
 * Error alerts. Every server error (a page, API route or server action that failed) and every crash a guest or
 * host hits in their browser is recorded in "AppError", one row per distinct error with a running count.
 *
 * Admins are emailed:
 *   - server errors: straight away, at most once every 6 hours per distinct error;
 *   - browser crashes: in the daily summary (the scheduled job), so a stranger can't flood the inbox;
 *   - never more than 12 alert emails a day in total (protects the email quota).
 *
 * Nothing secret is stored: RSVP links and other long codes are removed from paths, and no request headers,
 * cookies or form data are ever recorded. Recording never throws — a broken alert must not break the page.
 */

export type { ErrorSource }

const ALERT_EVERY_HOURS = 6
const MAX_ALERT_EMAILS_PER_DAY = 12

function adminEmails(): string[] {
  return [...new Set(
    [process.env.ADMIN_BOOTSTRAP_EMAIL, process.env.ADMIN_EMAILS]
      .flatMap((value) => (value ?? "").split(","))
      .map((value) => value.trim().toLowerCase())
      .filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)),
  )]
}

function describe(error: unknown): { message: string; detail: string | null } {
  if (error instanceof Error) {
    const digest = (error as Error & { digest?: string }).digest
    const stack = error.stack?.split("\n").slice(1, 8).map((l) => l.trim()).join("\n") ?? null
    return { message: `${error.name}: ${error.message}`.slice(0, 1000), detail: [digest ? `digest ${digest}` : null, stack].filter(Boolean).join("\n").slice(0, 2000) || null }
  }
  return { message: String(error).slice(0, 1000), detail: null }
}

type Recorded = { id: string; count: number }

async function upsert(source: ErrorSource, message: string, path: string | null, detail: string | null): Promise<Recorded | null> {
  const fingerprint = fingerprintOf(source, message, path)
  const rows = await db.$queryRaw<Recorded[]>`
    INSERT INTO "AppError" ("id", "fingerprint", "source", "message", "path", "detail", "count", "firstSeenAt", "lastSeenAt")
    VALUES (${randomUUID()}, ${fingerprint}, ${source}, ${message}, ${path}, ${detail}, 1, now(), now())
    ON CONFLICT ("fingerprint") DO UPDATE SET
      "count" = "AppError"."count" + 1, "lastSeenAt" = now(), "message" = EXCLUDED."message",
      "detail" = COALESCE(EXCLUDED."detail", "AppError"."detail"), "resolvedAt" = NULL
    RETURNING "id", "count"`
  return rows[0] ?? null
}

/** Claims the right to alert for this error (atomic, so two servers never send the same alert twice). */
async function claimAlert(id: string): Promise<boolean> {
  const hours = ALERT_EVERY_HOURS
  const claimed = await db.$executeRaw`
    UPDATE "AppError" SET "lastAlertedAt" = now()
    WHERE "id" = ${id} AND ("lastAlertedAt" IS NULL OR "lastAlertedAt" < now() - make_interval(hours => ${hours}::int))`
  if (claimed === 0) return false
  const quota = await rateLimit("error-alert-email", MAX_ALERT_EMAILS_PER_DAY, 24 * 60 * 60)
  return quota.ok
}

function alertHtml(items: Array<{ source: string; message: string; path: string | null; count: number; when: Date }>, intro: string): string {
  const rows = items.map((item) => `
    <tr><td style="padding:12px 0;border-top:1px solid #eee;">
      <div style="font-size:12px;color:#756d78;">${item.source === "server" ? "Server" : "Browser"} · ${escapeHtml(item.path ?? "unknown page")} · ${item.count}× · last ${escapeHtml(item.when.toISOString().replace("T", " ").slice(0, 16))} UTC</div>
      <div style="font-family:monospace;font-size:13px;color:#403447;word-break:break-word;">${escapeHtml(item.message.slice(0, 400))}</div>
    </td></tr>`).join("")
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#fff9f2;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px 28px;">
      <tr><td style="font-size:18px;font-weight:700;color:#6f5a86;padding-bottom:8px;">Events Partner · site error alert</td></tr>
      <tr><td style="font-size:14px;color:#403447;padding-bottom:8px;">${escapeHtml(intro)}</td></tr>
      ${rows}
      <tr><td style="padding-top:18px;"><a href="${escapeHtml(`${SITE_URL}/admin/settings#errors`)}" style="display:inline-block;padding:10px 20px;background:#6f5a86;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">Open error log</a></td></tr>
      <tr><td style="padding-top:14px;font-size:12px;color:#756d78;">You get this because your email is on the admin list. The same error alerts at most every ${ALERT_EVERY_HOURS} hours.</td></tr>
    </table></body></html>`
}

async function email(subject: string, html: string): Promise<void> {
  for (const to of adminEmails()) await sendEmail({ to, subject, html })
}

/**
 * Records one error. Server errors alert right away (throttled); browser errors wait for the daily summary.
 * Never throws.
 */
export async function recordError(input: { source: ErrorSource; error: unknown; path?: string | null }): Promise<void> {
  try {
    const { message, detail } = describe(input.error)
    const path = sanitizePath(input.path)
    const row = await upsert(input.source, message, path, detail)
    if (!row || input.source !== "server") return
    if (!(await claimAlert(row.id))) return
    await email(
      `Site error: ${message.slice(0, 80)}`,
      alertHtml([{ source: "server", message, path, count: row.count, when: new Date() }], "Something failed on the live site. Details below — nothing private (no RSVP links, cookies or form data) is included."),
    )
  } catch (failure) {
    // The error log must never become a second error (e.g. before the database update is applied).
    console.error("[error-alerts] could not record an error:", failure instanceof Error ? failure.message : failure)
  }
}

/** Daily summary: every error seen in the last day that hasn't been emailed yet (mostly browser crashes). */
export async function sendDailyErrorSummary(): Promise<{ sent: boolean; errors: number }> {
  try {
    const rows = await db.$queryRaw<Array<{ id: string; source: string; message: string; path: string | null; count: number; lastSeenAt: Date }>>`
      SELECT "id", "source", "message", "path", "count", "lastSeenAt" FROM "AppError"
      WHERE "resolvedAt" IS NULL AND "lastSeenAt" > now() - interval '1 day'
        AND ("lastAlertedAt" IS NULL OR "lastAlertedAt" < "lastSeenAt" - interval '6 hours')
      ORDER BY "count" DESC LIMIT 20`
    if (!rows.length) return { sent: false, errors: 0 }
    const ids = rows.map((r) => r.id)
    await db.$executeRaw`UPDATE "AppError" SET "lastAlertedAt" = now() WHERE "id" = ANY(${ids})`
    await email(
      `Daily summary: ${rows.length} site error${rows.length === 1 ? "" : "s"}`,
      alertHtml(rows.map((r) => ({ source: r.source, message: r.message, path: r.path, count: r.count, when: r.lastSeenAt })), "Errors from the last 24 hours that you haven't been emailed about yet."),
    )
    return { sent: true, errors: rows.length }
  } catch (failure) {
    console.error("[error-alerts] daily summary failed:", failure instanceof Error ? failure.message : failure)
    return { sent: false, errors: 0 }
  }
}

export type AppErrorRow = { id: string; source: string; message: string; path: string | null; detail: string | null; count: number; firstSeenAt: string; lastSeenAt: string; resolved: boolean }

/** For the admin error log. Returns null if the error-log table hasn't been created yet. */
export async function listRecentErrors(limit = 30): Promise<AppErrorRow[] | null> {
  try {
    const rows = await db.$queryRaw<Array<{ id: string; source: string; message: string; path: string | null; detail: string | null; count: number; firstSeenAt: Date; lastSeenAt: Date; resolvedAt: Date | null }>>`
      SELECT "id", "source", "message", "path", "detail", "count", "firstSeenAt", "lastSeenAt", "resolvedAt" FROM "AppError"
      WHERE "lastSeenAt" > now() - interval '30 days'
      ORDER BY ("resolvedAt" IS NULL) DESC, "lastSeenAt" DESC LIMIT ${limit}`
    return rows.map((r) => ({ id: r.id, source: r.source, message: r.message, path: r.path, detail: r.detail, count: r.count, firstSeenAt: r.firstSeenAt.toISOString(), lastSeenAt: r.lastSeenAt.toISOString(), resolved: r.resolvedAt !== null }))
  } catch {
    return null
  }
}

export { adminEmails as errorAlertRecipients }
