import { createHmac, timingSafeEqual } from "crypto"

/**
 * "Find your invitation" — secure guest lookup for the public RSVP page.
 *
 * Privacy rules enforced here (server-side only):
 *  - Only guests of the one event named in the URL are searched.
 *  - A search needs a real name: two words, or one whole first/last name of 3+ letters. Short prefixes such as
 *    "a" or "jo" match nothing, so the guest list can't be browsed letter by letter.
 *  - At most MAX_RESULTS matches are shown; more than that returns "please type your full name" with no names.
 *  - Results carry only a display name ("Rench S.", or the full name when the guest typed it exactly) and a
 *    short-lived signed reference — never IDs, emails, phones, notes, groups or tokens.
 *  - Choosing a result creates a signed, httpOnly session cookie bound to that one guest and event.
 */

export const MAX_RESULTS = 5
export const REF_TTL_MS = 15 * 60 * 1000
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value) throw new Error("AUTH_SECRET is required for RSVP lookup.")
  return value
}

function mac(purpose: string, payload: string): string {
  return createHmac("sha256", `${purpose}:${secret()}`).update(payload).digest("base64url")
}

function equal(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Lowercase, strip accents and punctuation, collapse spaces: "José  Dela-Cruz" -> "jose dela cruz". */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export type LookupGuest = { id: string; firstName: string; lastName: string | null }

/** Returns the matching guests, or "too-broad" / "too-short". Pure: callers pass this event's guests only. */
export function matchGuests(query: string, guests: LookupGuest[]): { status: "ok"; matches: LookupGuest[] } | { status: "too-short" | "too-broad" } {
  const q = normalizeName(query).slice(0, 80)
  const tokens = q.split(" ").filter(Boolean)
  if (!tokens.length || q.replace(/ /g, "").length < 3) return { status: "too-short" }
  const single = tokens.length === 1
  if (single && tokens[0].length < 3) return { status: "too-short" }
  if (!single && q.replace(/ /g, "").length < 4) return { status: "too-short" }

  const matches = guests.filter((g) => {
    const nameTokens = normalizeName(`${g.firstName} ${g.lastName ?? ""}`).split(" ").filter(Boolean)
    if (single) return nameTokens.includes(tokens[0]) // one word must be a whole first or last name
    // Several words: each must start one of the guest's name words, and together they must cover 4+ letters.
    return tokens.every((t) => nameTokens.some((n) => n.startsWith(t)))
  })
  if (matches.length > MAX_RESULTS) return { status: "too-broad" }
  return { status: "ok", matches }
}

/** "Rench Salazar" when the guest typed the full name exactly, otherwise "Rench S." */
export function displayName(query: string, guest: LookupGuest): string {
  const full = `${guest.firstName} ${guest.lastName ?? ""}`.trim()
  if (normalizeName(query) === normalizeName(full)) return full
  return guest.lastName ? `${guest.firstName} ${guest.lastName.trim().charAt(0).toUpperCase()}.` : guest.firstName
}

// ── Signed references (search result -> chosen invitation) ─────────────

export function signRef(guestId: string, eventId: string, now = Date.now()): string {
  const payload = `${guestId}.${eventId}.${now + REF_TTL_MS}`
  return `${Buffer.from(payload).toString("base64url")}.${mac("rsvp-ref", payload)}`
}

export function verifyRef(ref: unknown, eventId: string, now = Date.now()): string | null {
  if (typeof ref !== "string" || ref.length > 400) return null
  const [encoded, signature] = ref.split(".")
  if (!encoded || !signature) return null
  const payload = Buffer.from(encoded, "base64url").toString("utf8")
  if (!equal(signature, mac("rsvp-ref", payload))) return null
  const [guestId, refEvent, exp] = payload.split(".")
  if (refEvent !== eventId || !guestId || Number(exp) < now) return null
  return guestId
}

// ── Guest session (after the guest picked their invitation) ─────────────

export const sessionCookieName = (eventId: string) => `ep_rsvp_${eventId.replace(/[^a-zA-Z0-9]/g, "")}`

export function signSession(guestId: string, eventId: string, now = Date.now()): string {
  const payload = `${guestId}.${eventId}.${now + SESSION_TTL_MS}`
  return `${Buffer.from(payload).toString("base64url")}.${mac("rsvp-session", payload)}`
}

export function verifySession(value: string | undefined, eventId: string, now = Date.now()): string | null {
  if (!value || value.length > 400) return null
  const [encoded, signature] = value.split(".")
  if (!encoded || !signature) return null
  const payload = Buffer.from(encoded, "base64url").toString("utf8")
  if (!equal(signature, mac("rsvp-session", payload))) return null
  const [guestId, sessionEvent, exp] = payload.split(".")
  if (sessionEvent !== eventId || !guestId || Number(exp) < now) return null
  return guestId
}

/** Optional second check for duplicate names: the guest's email, or the last 4 digits of their phone. */
export function verificationMatches(answer: string, guest: { email: string | null; phone: string | null }): boolean {
  const a = answer.trim().toLowerCase()
  if (!a) return false
  if (guest.email && a === guest.email.trim().toLowerCase()) return true
  const digits = a.replace(/\D/g, "")
  const phone = (guest.phone ?? "").replace(/\D/g, "")
  return digits.length === 4 && phone.length >= 4 && phone.endsWith(digits)
}

export function canVerify(guest: { email: string | null; phone: string | null }): boolean {
  return !!(guest.email?.trim() || (guest.phone ?? "").replace(/\D/g, "").length >= 4)
}
