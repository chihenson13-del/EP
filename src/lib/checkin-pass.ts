import { createHmac, timingSafeEqual } from "crypto"

/**
 * Personal check-in passes (the QR code a guest shows at the entrance).
 *
 * The code is "EP1.<guest id>.<signature>": the signature is an HMAC of the guest AND event, so a pass only works
 * for that one guest at that one event, and it can't be guessed or edited into someone else's. It is NOT the
 * guest's secret RSVP token, so showing the pass at the door never gives anyone the ability to change an RSVP.
 */

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value) throw new Error("AUTH_SECRET is required for check-in passes.")
  return value
}

function sign(guestId: string, eventId: string): string {
  return createHmac("sha256", `checkin-pass:${secret()}`).update(`${guestId}.${eventId}`).digest("base64url").slice(0, 16)
}

export function checkInCode(guestId: string, eventId: string): string {
  return `EP1.${guestId}.${sign(guestId, eventId)}`
}

export type ScannedCode = { kind: "guest"; guestId: string } | { kind: "token"; token: string }

/**
 * Understands everything a door scanner might read: a check-in pass, a guest's personal RSVP link
 * (…/events/{slug}/rsvp/{token} or the older …/rsvp/{slug}/{token}), or a bare RSVP code typed by hand.
 */
export function readScannedCode(input: string, eventId: string): ScannedCode | null {
  const text = typeof input === "string" ? input.trim().slice(0, 500) : ""
  if (!text) return null

  const pass = /^EP1\.([A-Za-z0-9_-]{8,64})\.([A-Za-z0-9_-]{16})$/.exec(text)
  if (pass) {
    const [, guestId, signature] = pass
    const expected = sign(guestId, eventId)
    const ok = expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    return ok ? { kind: "guest", guestId } : null
  }

  const link = /\/(?:events\/[^/\s]+\/rsvp|rsvp\/[^/\s]+)\/([A-Za-z0-9_-]{8,128})\/?(?:[?#].*)?$/.exec(text)
  if (link) return { kind: "token", token: link[1] }

  if (/^[A-Za-z0-9_-]{8,128}$/.test(text)) return { kind: "token", token: text }
  return null
}
