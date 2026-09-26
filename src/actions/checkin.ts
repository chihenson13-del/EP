"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import type { ActionResult } from "@/actions/events"
import { readScannedCode } from "@/lib/checkin-pass"

export type ScanResult = {
  guestId: string
  name: string
  partySize: number
  seat: string | null
  rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"
  alreadyCheckedIn: boolean
}

export async function checkInGuest(eventId: string, guestId: string): Promise<ActionResult<{ name: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const guest = await db.guest.findFirst({ where: { id: guestId, eventId } })
  if (!guest) return { ok: false, error: "Guest not found." }

  await db.$transaction([
    db.guest.update({ where: { id: guestId }, data: { checkedIn: true, checkedInAt: new Date() } }),
    db.chair.updateMany({ where: { guestId }, data: { status: "CHECKED_IN" } }),
    db.checkInLog.create({ data: { eventId, guestId, action: "CHECK_IN", byUserId: user.id } }),
  ])

  revalidatePath(`/dashboard/events/${eventId}/checkin`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  return { ok: true, data: { name: `${guest.firstName} ${guest.lastName ?? ""}`.trim() } }
}

export async function undoCheckIn(eventId: string, guestId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  await db.$transaction([
    db.guest.updateMany({ where: { id: guestId, eventId }, data: { checkedIn: false, checkedInAt: null } }),
    db.chair.updateMany({ where: { guestId }, data: { status: "ASSIGNED" } }),
    db.checkInLog.create({ data: { eventId, guestId, action: "UNDO_CHECK_IN", byUserId: user.id } }),
  ])

  revalidatePath(`/dashboard/events/${eventId}/checkin`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  return { ok: true, data: undefined }
}

export async function checkInByToken(eventId: string, rsvpToken: string): Promise<ActionResult<{ name: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const guest = await db.guest.findFirst({ where: { eventId, rsvpToken } })
  if (!guest) return { ok: false, error: "No guest found for that code." }
  if (guest.checkedIn) return { ok: false, error: `${guest.firstName} is already checked in.` }

  return checkInGuest(eventId, guest.id)
}

/**
 * Door scanner: accepts a check-in pass QR, a personal RSVP link or a typed RSVP code. The guest must belong to
 * THIS event. Scanning someone who is already in is not an error — it says so, with the time, so the door team
 * knows the pass was already used.
 */
export async function checkInByCode(eventId: string, code: string): Promise<ActionResult<ScanResult>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const scanned = readScannedCode(code, eventId)
  if (!scanned) return { ok: false, error: "That code isn't a check-in pass for this event." }
  const guest = await db.guest.findFirst({
    where: scanned.kind === "guest" ? { id: scanned.guestId, eventId } : { rsvpToken: scanned.token, eventId },
    select: { id: true, firstName: true, lastName: true, checkedIn: true, rsvpStatus: true, numberAttending: true, chair: { select: { seatNumber: true, table: { select: { name: true } } } } },
  })
  if (!guest) return { ok: false, error: "No guest on this event's list matches that code." }

  const result: ScanResult = {
    guestId: guest.id,
    name: `${guest.firstName} ${guest.lastName ?? ""}`.trim(),
    partySize: guest.rsvpStatus === "ATTENDING" ? Math.max(1, guest.numberAttending ?? 1) : 1,
    seat: guest.chair ? `${guest.chair.table.name} · Seat ${guest.chair.seatNumber}` : null,
    rsvpStatus: guest.rsvpStatus,
    alreadyCheckedIn: guest.checkedIn,
  }
  if (guest.checkedIn) return { ok: true, data: result }

  const done = await checkInGuest(eventId, guest.id)
  if (!done.ok) return done
  return { ok: true, data: result }
}
