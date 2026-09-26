"use server"

import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"
import { recordError, listRecentErrors, errorAlertRecipients, type AppErrorRow } from "@/lib/error-alerts"
import { rateLimit } from "@/lib/rate-limit"
import { isEmailConfigured } from "@/lib/mailer"
import type { ActionResult } from "@/actions/events"

export async function refreshErrorLog(): Promise<ActionResult<AppErrorRow[]>> {
  await requireAdmin()
  const rows = await listRecentErrors()
  if (!rows) return { ok: false, error: "The error log isn't set up yet — apply the database update above first." }
  return { ok: true, data: rows }
}

export async function markErrorFixed(id: string): Promise<ActionResult> {
  await requireAdmin()
  if (typeof id !== "string" || id.length > 64) return { ok: false, error: "Unknown error." }
  await db.$executeRaw`UPDATE "AppError" SET "resolvedAt" = now() WHERE "id" = ${id}`
  return { ok: true, data: undefined }
}

export async function markAllErrorsFixed(): Promise<ActionResult> {
  await requireAdmin()
  await db.$executeRaw`UPDATE "AppError" SET "resolvedAt" = now() WHERE "resolvedAt" IS NULL`
  return { ok: true, data: undefined }
}

/** Sends one real alert email to the admins, so they can see that alerts reach them. */
export async function sendTestErrorAlert(): Promise<ActionResult<{ recipients: number; mock: boolean }>> {
  const admin = await requireAdmin()
  const limited = await rateLimit(`test-error-alert:${admin.id}`, 3, 60 * 60)
  if (!limited.ok) return { ok: false, error: "You've sent a few test alerts already — try again in an hour." }
  if (!(await listRecentErrors(1))) return { ok: false, error: "The error log isn't set up yet — apply the database update above first." }
  const recipients = errorAlertRecipients()
  if (!recipients.length) return { ok: false, error: "No admin email is configured (ADMIN_BOOTSTRAP_EMAIL / ADMIN_EMAILS)." }
  // Re-arm the test row so the 6-hour per-error throttle doesn't swallow a second test.
  await db.$executeRaw`UPDATE "AppError" SET "lastAlertedAt" = NULL WHERE "path" = 'Admin test'`.catch(() => undefined)
  const error = new Error("Test alert from Admin → Settings — alerts reach you. You can mark this as fixed.")
  error.name = "TestAlert"
  await recordError({ source: "server", error, path: "Admin test" })
  return { ok: true, data: { recipients: recipients.length, mock: !isEmailConfigured } }
}
