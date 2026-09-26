"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { rateLimit, waitMessage } from "@/lib/rate-limit"
import { sendEmail } from "@/lib/mailer"
import { invitationTemplate } from "@/lib/email-templates"
import { formatDate } from "@/lib/timezone"
import { SITE_URL } from "@/lib/site"
import { readRsvpPrompt } from "@/lib/rsvp-prompt"
import { readRsvpForm, rsvpPath } from "@/lib/rsvp-settings"
import type { ActionResult } from "@/actions/events"
import type { RsvpStatus } from "@prisma/client"

/**
 * Host-side RSVP actions for the RSVP Responses dashboard. Every action proves the signed-in user can manage the
 * event, then only touches a guest that belongs to THAT event (never by guest id alone).
 */

async function authorize(eventId: string) {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  return user
}

function refresh(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  revalidatePath(`/dashboard/events/${eventId}/checkin`)
  revalidatePath(`/dashboard/events/${eventId}`)
}

const STATUSES: RsvpStatus[] = ["PENDING", "ATTENDING", "DECLINED", "MAYBE"]

/** The host records or corrects a guest's RSVP (e.g. a reply by phone). Updates the guest's single RSVP in place. */
export async function hostUpdateRsvp(
  eventId: string,
  guestId: string,
  input: { status: RsvpStatus; numberAttending?: number | null; mealPreference?: string | null; message?: string | null },
): Promise<ActionResult> {
  await authorize(eventId)
  if (!STATUSES.includes(input?.status)) return { ok: false, error: "Choose an RSVP status." }
  const guest = await db.guest.findFirst({ where: { id: guestId, eventId }, select: { id: true, plusOneAllowed: true, maxPlusOnes: true, rsvpFirstRespondedAt: true } })
  if (!guest) return { ok: false, error: "Guest not found on this event's list." }

  const page = await db.eventPage.findUnique({ where: { eventId }, select: { layout: true } })
  const prompt = readRsvpPrompt(page?.layout)
  const form = readRsvpForm(page?.layout)
  const meal = typeof input.mealPreference === "string" ? input.mealPreference.trim().slice(0, 120) : ""
  if (meal && form.mealOptions.length && !form.mealOptions.includes(meal)) return { ok: false, error: "Choose one of the meal options." }

  const maxAttending = 1 + (guest.plusOneAllowed ? guest.maxPlusOnes : 0)
  const status = input.status
  const now = new Date()
  const count = Math.round(Number(input.numberAttending ?? 1))
  await db.guest.update({
    where: { id: guest.id },
    data: status === "PENDING"
      ? { rsvpStatus: "PENDING", rsvpAnswer: null, numberAttending: null, respondedAt: null }
      : {
          rsvpStatus: status,
          rsvpAnswer: prompt.options.find((o) => o.status === status)?.label ?? null,
          numberAttending: status === "ATTENDING" ? Math.max(1, Math.min(Number.isFinite(count) ? count : 1, maxAttending)) : 0,
          mealPreference: meal || null,
          rsvpMessage: typeof input.message === "string" ? input.message.trim().slice(0, 1000) || null : undefined,
          respondedAt: now,
          rsvpFirstRespondedAt: guest.rsvpFirstRespondedAt ?? now,
        },
  })
  refresh(eventId)
  return { ok: true, data: undefined }
}

/** Seat a guest at a table (first free seat), or remove them from their seat with tableId = null. */
export async function setGuestTable(eventId: string, guestId: string, tableId: string | null): Promise<ActionResult<{ seatNumber: number | null }>> {
  await authorize(eventId)
  const guest = await db.guest.findFirst({ where: { id: guestId, eventId }, select: { id: true, checkedIn: true, chair: { select: { id: true, tableId: true, seatNumber: true } } } })
  if (!guest) return { ok: false, error: "Guest not found on this event's list." }

  if (!tableId) {
    if (guest.chair) await db.chair.update({ where: { id: guest.chair.id }, data: { guestId: null, status: "EMPTY" } })
    refresh(eventId)
    revalidatePath(`/dashboard/events/${eventId}/seating`)
    return { ok: true, data: { seatNumber: null } }
  }
  if (guest.chair?.tableId === tableId) return { ok: true, data: { seatNumber: guest.chair.seatNumber } }

  const table = await db.table.findFirst({ where: { id: tableId, eventId }, select: { id: true, name: true } })
  if (!table) return { ok: false, error: "Table not found." }
  // First free seat; VIP and reserved seats are left for the host to assign on the seating chart.
  const seat = await db.chair.findFirst({ where: { tableId, guestId: null, status: "EMPTY" }, orderBy: { seatNumber: "asc" }, select: { id: true, seatNumber: true } })
  if (!seat) return { ok: false, error: `${table.name} has no free seats.` }

  await db.$transaction(async (tx) => {
    if (guest.chair) await tx.chair.update({ where: { id: guest.chair.id }, data: { guestId: null, status: "EMPTY" } })
    await tx.chair.update({ where: { id: seat.id }, data: { guestId: guest.id, status: guest.checkedIn ? "CHECKED_IN" : "ASSIGNED" } })
  })
  refresh(eventId)
  revalidatePath(`/dashboard/events/${eventId}/seating`)
  return { ok: true, data: { seatNumber: seat.seatNumber } }
}

/**
 * Email the guest their invitation again, with their personal RSVP link. Email only: SMS is paused. When email
 * isn't configured on this site the result says so (mock), rather than claiming it was delivered.
 */
export async function resendInvitation(eventId: string, guestId: string): Promise<ActionResult<{ mock: boolean; to: string }>> {
  const user = await authorize(eventId)
  const guest = await db.guest.findFirst({ where: { id: guestId, eventId }, select: { id: true, firstName: true, email: true, rsvpToken: true } })
  if (!guest) return { ok: false, error: "Guest not found on this event's list." }
  if (!guest.email) return { ok: false, error: `${guest.firstName} has no email address. Add one with Edit guest, or copy the RSVP link and send it yourself.` }

  const limited = await rateLimit(`resend-invite:${user.id}:${guest.id}`, 3, 60 * 60)
  if (!limited.ok) return { ok: false, error: waitMessage(limited.retryAfterSec) }

  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, select: { name: true, slug: true, hostName: true, date: true, timeLabel: true, venueName: true, address: true } })
  const rsvpUrl = `${SITE_URL}${rsvpPath(event.slug, guest.rsvpToken)}`
  const dateLabel = event.date ? `${formatDate(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${event.timeLabel ? ` · ${event.timeLabel}` : ""}` : undefined
  const subject = `You're invited to ${event.name}`
  const html = invitationTemplate({
    guestName: guest.firstName, eventName: event.name, hostName: event.hostName, dateLabel,
    venueLabel: [event.venueName, event.address].filter(Boolean).join(", ") || undefined, rsvpUrl,
  })
  const result = await sendEmail({ to: guest.email, subject, html })
  await db.messageLog.create({
    data: {
      eventId, guestId: guest.id, channel: "EMAIL", type: "INVITATION",
      status: result.mock ? "MOCK_SENT" : result.ok ? "SENT" : "FAILED",
      subject, body: `Invitation with personal RSVP link: ${rsvpUrl}`, provider: result.provider, isMock: result.mock,
      sentAt: result.ok ? new Date() : null, errorMessage: result.error,
    },
  })
  revalidatePath(`/dashboard/events/${eventId}/messaging`)
  if (!result.ok) return { ok: false, error: `The email couldn't be sent: ${result.error ?? "unknown error"}.` }
  return { ok: true, data: { mock: result.mock, to: guest.email } }
}

/** Check several guests in (or undo it) at once, e.g. from the RSVP Responses selection bar. */
export async function bulkSetCheckIn(eventId: string, guestIds: string[], checkedIn: boolean): Promise<ActionResult<{ count: number }>> {
  const user = await authorize(eventId)
  const requested = Array.isArray(guestIds) ? guestIds.filter((id) => typeof id === "string").slice(0, 2000) : []
  // Only guests of this event whose state actually changes.
  const guests = await db.guest.findMany({ where: { eventId, id: { in: requested }, checkedIn: !checkedIn }, select: { id: true } })
  const ids = guests.map((g) => g.id)
  if (!ids.length) return { ok: true, data: { count: 0 } }
  await db.$transaction([
    db.guest.updateMany({ where: { eventId, id: { in: ids } }, data: { checkedIn, checkedInAt: checkedIn ? new Date() : null } }),
    db.chair.updateMany({ where: { guestId: { in: ids }, table: { eventId } }, data: { status: checkedIn ? "CHECKED_IN" : "ASSIGNED" } }),
    db.checkInLog.createMany({ data: ids.map((guestId) => ({ eventId, guestId, action: checkedIn ? "CHECK_IN" : "UNDO_CHECK_IN", byUserId: user.id })) }),
  ])
  refresh(eventId)
  return { ok: true, data: { count: ids.length } }
}
