"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit"
import { db } from "@/lib/db"
import { rsvpSubmitSchema, rsvpSessionSubmitSchema, type RsvpSubmitInput, type RsvpSessionSubmitInput } from "@/lib/validations/rsvp"
import { applyRsvp } from "@/lib/rsvp-submit"
import { lookupMode, readRsvpForm } from "@/lib/rsvp-settings"
import {
  canVerify, displayName, matchGuests, sessionCookieName, signRef, signSession, verificationMatches, verifyRef, verifySession, SESSION_TTL_MS,
} from "@/lib/rsvp-lookup"
import { loadRsvpEvent } from "@/lib/rsvp-page-data"
import type { ActionResult } from "@/actions/events"

function refresh(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}`)
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
}

/** Personal RSVP link: the guest's secret token authorizes the submission. */
export async function submitRsvp(input: RsvpSubmitInput): Promise<ActionResult<{ status: string }>> {
  const parsed = rsvpSubmitSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." }
  const { guestId, rsvpToken, ...data } = parsed.data

  // Public endpoint (no login): cap it per network address and per invitation.
  const [byIp, byToken] = await Promise.all([
    rateLimit(`rsvp:ip:${clientIp(await headers())}`, 120, 10 * 60),
    rateLimit(`rsvp:token:${rsvpToken}`, 40, 10 * 60),
  ])
  if (!byIp.ok || !byToken.ok) return { ok: false, error: waitMessage(Math.max(byIp.ok ? 0 : byIp.retryAfterSec, byToken.ok ? 0 : byToken.retryAfterSec)) }

  // The token must match the guest's own secret RSVP token — knowing a guest ID alone is never enough.
  const guest = await db.guest.findUnique({ where: { id: guestId }, select: { id: true, rsvpToken: true, eventId: true } })
  if (!guest || guest.rsvpToken !== rsvpToken) return { ok: false, error: "This RSVP link is invalid." }

  const result = await applyRsvp(guest.id, data)
  if (!result.ok) return result
  refresh(guest.eventId)
  return { ok: true, data: { status: result.status } }
}

// ── "Find your invitation" (public RSVP page) ───────────────────────────

export type LookupResult =
  | { kind: "matches"; matches: Array<{ ref: string; name: string; needsVerification: boolean }> }
  | { kind: "none" | "too-short" | "too-broad" }

/** Searches ONLY the guests of this event and returns display names + signed, short-lived references. */
export async function findInvitation(slug: string, query: string): Promise<ActionResult<LookupResult>> {
  const event = await loadRsvpEvent(slug)
  if (!event) return { ok: false, error: "This event isn't accepting RSVPs here." }
  const lookup = lookupMode(readRsvpForm(event.page?.layout), event.personalizedRsvpOnly)
  if (lookup === "off") return { ok: false, error: "Please use the personal RSVP link the host sent you." }

  const ip = clientIp(await headers())
  const [perEvent, global] = await Promise.all([
    rateLimit(`rsvp-lookup:${event.id}:${ip}`, 20, 10 * 60),
    rateLimit(`rsvp-lookup:ip:${ip}`, 60, 10 * 60),
  ])
  if (!perEvent.ok || !global.ok) return { ok: false, error: waitMessage(Math.max(perEvent.ok ? 0 : perEvent.retryAfterSec, global.ok ? 0 : global.retryAfterSec)) }

  const q = typeof query === "string" ? query.slice(0, 80) : ""
  const guests = await db.guest.findMany({ where: { eventId: event.id }, select: { id: true, firstName: true, lastName: true } })
  const result = matchGuests(q, guests)
  if (result.status !== "ok") return { ok: true, data: { kind: result.status } }
  if (!result.matches.length) return { ok: true, data: { kind: "none" } }

  const names = result.matches.map((g) => displayName(q, g))
  const duplicated = (name: string) => names.filter((n) => n === name).length > 1
  return {
    ok: true,
    data: {
      kind: "matches",
      matches: result.matches.map((g, i) => ({
        ref: signRef(g.id, event.id),
        name: names[i],
        needsVerification: lookup === "name-verified" || duplicated(names[i]),
      })),
    },
  }
}

/**
 * The guest chose "this is me". Re-validates the signed reference, applies the extra check when required
 * (email, or last 4 digits of phone), then starts a signed httpOnly session for that one guest.
 */
export async function openInvitation(slug: string, ref: string, verification?: string): Promise<ActionResult<{ needsVerification?: true; firstName?: string }>> {
  const event = await loadRsvpEvent(slug)
  if (!event) return { ok: false, error: "This event isn't accepting RSVPs here." }
  const guestId = verifyRef(ref, event.id)
  if (!guestId) return { ok: false, error: "That search expired. Please search for your name again." }

  const guest = await db.guest.findFirst({ where: { id: guestId, eventId: event.id }, select: { id: true, firstName: true, lastName: true, email: true, phone: true } })
  if (!guest) return { ok: false, error: "That invitation couldn't be found." }

  const lookup = lookupMode(readRsvpForm(event.page?.layout), event.personalizedRsvpOnly)
  if (lookup === "off") return { ok: false, error: "Please use the personal RSVP link the host sent you." }
  // Look-alikes: other guests of this event with the same first name and the same last-name initial.
  const initial = (guest.lastName ?? "").trim().charAt(0).toLowerCase()
  const sameFirst = await db.guest.findMany({ where: { eventId: event.id, firstName: { equals: guest.firstName, mode: "insensitive" } }, select: { lastName: true } })
  const lookAlikes = sameFirst.filter((g) => (g.lastName ?? "").trim().charAt(0).toLowerCase() === initial).length
  const mustVerify = lookup === "name-verified" || lookAlikes > 1
  if (mustVerify && canVerify(guest)) {
    if (!verification) return { ok: true, data: { needsVerification: true } }
    const attempts = await rateLimit(`rsvp-verify:${guest.id}`, 6, 15 * 60)
    if (!attempts.ok) return { ok: false, error: waitMessage(attempts.retryAfterSec) }
    if (!verificationMatches(verification, guest)) return { ok: false, error: "That doesn't match what the host has on file. Try your email address or the last 4 digits of your phone number." }
  } else if (lookup === "name-verified" && !canVerify(guest)) {
    return { ok: false, error: "We can't confirm this invitation online. Please use the personal link from the host, or contact them." }
  }

  const jar = await cookies()
  jar.set(sessionCookieName(event.id), signSession(guest.id, event.id), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return { ok: true, data: { firstName: guest.firstName } }
}

/** Submit through the name-search session (no personal token in the browser). */
export async function submitRsvpForSession(slug: string, input: RsvpSessionSubmitInput): Promise<ActionResult<{ status: string }>> {
  const event = await loadRsvpEvent(slug)
  if (!event) return { ok: false, error: "This event isn't accepting RSVPs here." }
  const guestId = verifySession((await cookies()).get(sessionCookieName(event.id))?.value, event.id)
  if (!guestId) return { ok: false, error: "Your session expired. Please search for your name again." }
  // The session is bound to this event; the guest must still belong to it.
  const owned = await db.guest.findFirst({ where: { id: guestId, eventId: event.id }, select: { id: true } })
  if (!owned) return { ok: false, error: "That invitation couldn't be found." }

  const parsed = rsvpSessionSubmitSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." }
  const limited = await rateLimit(`rsvp:session:${guestId}`, 40, 10 * 60)
  if (!limited.ok) return { ok: false, error: waitMessage(limited.retryAfterSec) }

  const result = await applyRsvp(guestId, parsed.data)
  if (!result.ok) return result
  refresh(event.id)
  return { ok: true, data: { status: result.status } }
}

/** "Not you?" — forget the chosen invitation on this device. */
export async function leaveInvitation(slug: string): Promise<ActionResult> {
  const event = await loadRsvpEvent(slug)
  if (event) (await cookies()).delete(sessionCookieName(event.id))
  return { ok: true, data: undefined }
}
