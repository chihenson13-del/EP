import { hmacHex, safeEqual } from "@/lib/messenger/crypto"

/**
 * Per-guest opt-in reference for m.me links: m.me/<PAGE_ID>?ref=<ref>.
 * Meta returns the ref (with the guest's Page-scoped ID) in a messaging_referrals or messaging_postbacks webhook
 * when the guest opens the link. Format: "ep" + guestId + "x" + 20 hex chars of an HMAC, so it is alphanumeric
 * as Meta requires and can't be forged to link someone else's conversation to a guest.
 */
function secret(): string {
  const value = process.env.META_TOKEN_ENCRYPTION_KEY || process.env.AUTH_SECRET
  if (!value) throw new Error("No secret configured for Messenger opt-in links.")
  return `messenger-optin:${value}`
}

export function buildOptInRef(guestId: string): string {
  return `ep${guestId}x${hmacHex(secret(), guestId).slice(0, 20)}`
}

/** Returns the guest ID if the ref is one of ours and untampered. */
export function parseOptInRef(ref: unknown): string | null {
  if (typeof ref !== "string" || ref.length > 120) return null
  const match = /^ep([a-z0-9]{10,40})x([a-f0-9]{20})$/.exec(ref)
  if (!match) return null
  const [, guestId, mac] = match
  return safeEqual(mac, hmacHex(secret(), guestId).slice(0, 20)) ? guestId : null
}

export function optInLink(pageId: string, guestId: string): string {
  return `https://m.me/${encodeURIComponent(pageId)}?ref=${buildOptInRef(guestId)}`
}
