"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import type { ActionResult } from "@/actions/events"

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
