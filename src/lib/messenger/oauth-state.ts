import { randomBytes } from "crypto"
import { hmacHex, safeEqual } from "@/lib/messenger/crypto"

/**
 * OAuth CSRF protection. The state sent to Meta is "<nonce>.<mac>", where mac binds the nonce to the signed-in
 * Events Partner user. The nonce is also kept in an httpOnly cookie scoped to the Meta callback path, so the
 * callback only accepts a state that this browser started, for this user, within 10 minutes.
 */
export const STATE_COOKIE = "ep_meta_oauth_state"
export const STATE_COOKIE_PATH = "/api/integrations/meta"
export const STATE_MAX_AGE_SEC = 600

function key(userId: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is required for Meta OAuth state.")
  return `meta-oauth:${secret}:${userId}`
}

export function createState(userId: string): { state: string; nonce: string } {
  const nonce = randomBytes(24).toString("base64url")
  return { nonce, state: `${nonce}.${hmacHex(key(userId), nonce)}` }
}

export function verifyState(userId: string, state: string | null, cookieNonce: string | undefined): boolean {
  if (!state || !cookieNonce) return false
  const [nonce, mac] = state.split(".")
  if (!nonce || !mac) return false
  return safeEqual(nonce, cookieNonce) && safeEqual(mac, hmacHex(key(userId), nonce))
}
