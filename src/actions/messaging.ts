"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { sendEmail } from "@/lib/mailer"
import { sendSms, fillMessageVariables } from "@/lib/sms"
import { messageBodyToHtml } from "@/lib/email-templates"
import { sendMessageSchema, type SendMessageInput } from "@/lib/validations/messaging"
import type { ActionResult } from "@/actions/events"

export async function sendMessage(input: SendMessageInput): Promise<ActionResult<{ sent: number; failed: number; skipped: number; scheduled: number; mock: boolean }>> {
  const user = await requireUser()
  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const d = parsed.data

  const hasAccess = await requireEventAccess(user.id, d.eventId).then(() => true).catch(() => false)
  if (!hasAccess) return { ok: false, error: "You do not have access to this event." }

  if (d.channel === "SMS") {
    const allowed = await hasFeature(user.id, d.eventId, FEATURES.SMS_MESSAGING)
    if (!allowed) return { ok: false, error: "SMS messaging requires Pro or Unlimited." }
  }

  const scheduledFor = d.scheduledFor ? new Date(d.scheduledFor) : null
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) return { ok: false, error: "That schedule time isn't valid." }
  const isFuture = !!scheduledFor && scheduledFor.getTime() > Date.now()
  if (isFuture) {
    const allowed = await hasFeature(user.id, d.eventId, FEATURES.EMAIL_SCHEDULING)
    if (!allowed) return { ok: false, error: "Scheduled sending requires Pro or Unlimited." }
  }

  const event = await db.event.findUniqueOrThrow({ where: { id: d.eventId } })
  const guests = await db.guest.findMany({ where: { id: { in: d.guestIds }, eventId: d.eventId } })

  let sent = 0, failed = 0, skipped = 0, scheduled = 0, anyMock = false

  for (const guest of guests) {
    const to = d.channel === "EMAIL" ? guest.email : guest.phone
    if (!to) {
      skipped++
      continue
    }

    const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${event.slug}/${guest.rsvpToken}`
    const filledBody = fillMessageVariables(d.body, {
      name: guest.firstName,
      event: event.name,
      date: event.date ? new Date(event.date).toLocaleDateString() : "",
      time: event.timeLabel ?? "",
      venue: event.venueName ?? "",
      rsvp_link: rsvpUrl,
    })

    if (isFuture) {
      await db.messageLog.create({
        data: { eventId: d.eventId, guestId: guest.id, channel: d.channel, type: d.type, status: "SCHEDULED", subject: d.subject || null, body: filledBody, scheduledFor },
      })
      scheduled++
      continue
    }

    if (d.channel === "EMAIL") {
      const result = await sendEmail({ to, subject: d.subject || event.name, html: messageBodyToHtml(filledBody) })
      anyMock = anyMock || result.mock
      await db.messageLog.create({
        data: {
          eventId: d.eventId, guestId: guest.id, channel: "EMAIL", type: d.type,
          status: result.mock ? "MOCK_SENT" : result.ok ? "SENT" : "FAILED",
          subject: d.subject || null, body: filledBody, provider: result.provider, isMock: result.mock,
          sentAt: result.ok ? new Date() : null, errorMessage: result.error,
        },
      })
      if (result.ok) sent++
      else failed++
    } else {
      const result = await sendSms({ to, message: filledBody })
      anyMock = anyMock || result.mock
      await db.messageLog.create({
        data: {
          eventId: d.eventId, guestId: guest.id, channel: "SMS", type: d.type,
          status: result.mock ? "MOCK_SENT" : result.ok ? "SENT" : "FAILED",
          body: filledBody, provider: result.provider, isMock: result.mock,
          sentAt: result.ok ? new Date() : null, errorMessage: result.error,
        },
      })
      if (result.ok) sent++
      else failed++
    }
  }

  revalidatePath(`/dashboard/events/${d.eventId}/messaging`)
  return { ok: true, data: { sent, failed, skipped, scheduled, mock: anyMock } }
}

export async function saveMessageTemplate(eventId: string, input: { id?: string; channel: "EMAIL" | "SMS"; type: "INVITATION" | "REMINDER" | "CUSTOM"; subject?: string; body: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const hasAccess = await requireEventAccess(user.id, eventId).then(() => true).catch(() => false)
  if (!hasAccess) return { ok: false, error: "You do not have access to this event." }
  if (input.body.length > 5000 || (input.subject?.length ?? 0) > 300) return { ok: false, error: "That message is too long." }

  let template: { id: string }
  if (input.id) {
    // Scope the update to this event so a template id from another event can't be overwritten.
    const updated = await db.messageTemplate.updateMany({ where: { id: input.id, eventId }, data: { subject: input.subject, body: input.body } })
    if (updated.count === 0) return { ok: false, error: "Template not found." }
    template = { id: input.id }
  } else {
    template = await db.messageTemplate.create({ data: { eventId, channel: input.channel, type: input.type, subject: input.subject, body: input.body } })
  }

  revalidatePath(`/dashboard/events/${eventId}/messaging`)
  return { ok: true, data: { id: template.id } }
}
