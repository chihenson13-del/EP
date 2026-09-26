"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { rateLimit, waitMessage } from "@/lib/rate-limit"
import { db } from "@/lib/db"
import type { ActionResult } from "@/actions/events"
import {
  canUseMessenger, disconnect, getEligibility, selectPage, sendMessage, type Eligibility,
} from "@/lib/messenger/meta-messenger-service"

const SETTINGS = "/dashboard/settings/integrations"

export async function chooseMetaPage(pageId: string): Promise<ActionResult> {
  const user = await requireUser()
  if (!(await canUseMessenger(user.id, null))) return { ok: false, error: "The Meta integration isn't available." }
  if (typeof pageId !== "string" || !/^\d{1,30}$/.test(pageId)) return { ok: false, error: "Choose a Page." }
  const result = await selectPage(user.id, pageId)
  revalidatePath(SETTINGS)
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.error }
}

export async function disconnectMeta(): Promise<ActionResult> {
  const user = await requireUser()
  await disconnect(user.id)
  revalidatePath(SETTINGS)
  return { ok: true, data: undefined }
}

/** Eligibility for the guest panel. Always scoped to the signed-in user's own event and guest. */
export async function getGuestMessengerEligibility(eventId: string, guestId: string): Promise<ActionResult<Eligibility>> {
  const user = await requireUser()
  const ok = await requireEventAccess(user.id, eventId).then(() => true).catch(() => false)
  if (!ok) return { ok: false, error: "You do not have access to this event." }
  const guest = await db.guest.findFirst({ where: { id: guestId, eventId }, select: { event: { select: { ownerId: true } } } })
  if (!guest) return { ok: false, error: "Guest not found." }
  // Messages always go through the event owner's connected Page, never a collaborator's.
  return { ok: true, data: await getEligibility(guest.event.ownerId, eventId, guestId) }
}

export async function sendMessengerMessage(input: { eventId: string; guestId: string; text: string; idempotencyKey: string }): Promise<ActionResult<{ status: "SENT" }>> {
  const user = await requireUser()
  const ok = await requireEventAccess(user.id, input.eventId).then(() => true).catch(() => false)
  if (!ok) return { ok: false, error: "You do not have access to this event." }
  if (typeof input.idempotencyKey !== "string" || !/^[\w-]{16,64}$/.test(input.idempotencyKey)) return { ok: false, error: "Please try again." }

  const guest = await db.guest.findFirst({ where: { id: input.guestId, eventId: input.eventId }, select: { event: { select: { ownerId: true } } } })
  if (!guest) return { ok: false, error: "Guest not found." }
  // Only the event owner sends from their own Page.
  if (guest.event.ownerId !== user.id) return { ok: false, error: "Only the event owner can send Messenger messages from their Page." }

  for (const [key, limit, windowSec] of [[`messenger:user:${user.id}`, 30, 60], [`messenger:guest:${input.guestId}`, 5, 60]] as const) {
    const limited = await rateLimit(key, limit, windowSec)
    if (!limited.ok) return { ok: false, error: waitMessage(limited.retryAfterSec) }
  }

  const result = await sendMessage({ userId: user.id, eventId: input.eventId, guestId: input.guestId, text: String(input.text ?? ""), idempotencyKey: input.idempotencyKey })
  revalidatePath(`/dashboard/events/${input.eventId}/guests`)
  return result.ok ? { ok: true, data: { status: "SENT" } } : { ok: false, error: result.error }
}
