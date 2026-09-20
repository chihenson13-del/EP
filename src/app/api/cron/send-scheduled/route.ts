import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/mailer"
import { sendSms } from "@/lib/sms"
import { messageBodyToHtml } from "@/lib/email-templates"

export const dynamic = "force-dynamic"

function isAuthorized(header: string | null, secret: string): boolean {
  const a = Buffer.from(header ?? "")
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Delivers messages that were scheduled for a future time. Invoked by the Vercel Cron entry in
 * vercel.json, which sends `Authorization: Bearer $CRON_SECRET`. Refuses to run without CRON_SECRET,
 * so the endpoint can never be triggered anonymously.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 })
  if (!isAuthorized(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const due = await db.messageLog.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } },
    include: { guest: { select: { email: true, phone: true } }, event: { select: { name: true, status: true } } },
    orderBy: { scheduledFor: "asc" },
    take: 200,
  })

  let sent = 0, failed = 0, skipped = 0

  for (const log of due) {
    // Claim the row first so an overlapping run can't deliver the same message twice.
    const claimed = await db.messageLog.updateMany({ where: { id: log.id, status: "SCHEDULED" }, data: { status: "PENDING" } })
    if (claimed.count === 0) continue

    const to = log.channel === "EMAIL" ? log.guest?.email : log.guest?.phone
    if (!to || log.event.status === "ARCHIVED") {
      await db.messageLog.update({ where: { id: log.id }, data: { status: "FAILED", errorMessage: !to ? "Guest has no contact info (or was removed)." : "Event was cancelled." } })
      skipped++
      continue
    }

    const result =
      log.channel === "EMAIL"
        ? await sendEmail({ to, subject: log.subject || log.event.name, html: messageBodyToHtml(log.body) })
        : await sendSms({ to, message: log.body })

    await db.messageLog.update({
      where: { id: log.id },
      data: {
        status: result.mock ? "MOCK_SENT" : result.ok ? "SENT" : "FAILED",
        provider: result.provider,
        isMock: result.mock,
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error,
      },
    })
    if (result.ok) sent++
    else failed++
  }

  return NextResponse.json({ processed: due.length, sent, failed, skipped })
}
