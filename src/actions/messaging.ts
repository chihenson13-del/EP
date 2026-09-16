"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { sendEmail } from "@/lib/mailer"
import { sendSms, fillMessageVariables } from "@/lib/sms"
import { sendMessageSchema, type SendMessageInput } from "@/lib/validations/messaging"
import type { ActionResult } from "@/actions/events"

export async function sendMessage(input: SendMessageInput): Promise<ActionResult<{ sent: number; failed: number; skipped: number; mock: boolean }>> {
  const user = await requireUser()
  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const d = parsed.data

  await requireEventAccess(user.id, d.eventId).catch(() => { throw new Error("NO_ACCESS") })

  if (d.channel === "SMS") {
    const allowed = await hasFeature(user.id, d.eventId, FEATURES.SMS_MESSAGING)
    if (!allowed) return { ok: false, error: "SMS messaging requires Pro or Unlimited." }
  }

  const event = await db.event.findUniqueOrThrow({ where: { id: d.eventId } })
  const guests = await db.guest.findMany({ where: { id: { in: d.guestIds }, eventId: d.eventId } })

  const scheduledFor = d.scheduledFor ? new Date(d.scheduledFor) : null
  const isFuture = scheduledFor && scheduledFor.getTime() > Date.now()

  let sent = 0, failed = 0, skipped = 0, anyMock = false

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
      sent++
      continue
    }

    if (d.channel === "EMAIL") {
      const result = await sendEmail({ to, subject: d.subject || event.name, html: filledBody.replace(/\n/g, "<br/>") })
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
  return { ok: true, data: { sent, failed, skipped, mock: anyMock } }
}

export async function saveMessageTemplate(eventId: string, input: { id?: string; channel: "EMAIL" | "SMS"; type: "INVITATION" | "REMINDER" | "CUSTOM"; subject?: string; body: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const template = input.id
    ? await db.messageTemplate.update({ where: { id: input.id }, data: { subject: input.subject, body: input.body } })
    : await db.messageTemplate.create({ data: { eventId, channel: input.channel, type: input.type, subject: input.subject, body: input.body } })

  revalidatePath(`/dashboard/events/${eventId}/messaging`)
  return { ok: true, data: { id: template.id } }
}
