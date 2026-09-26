import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto"

/**
 * AES-256-GCM encryption for Meta access tokens at rest. Output format: v1.<iv>.<tag>.<ciphertext> (base64url).
 * The key comes from META_TOKEN_ENCRYPTION_KEY (32 random bytes, base64) and never leaves the server.
 * Tokens are only decrypted inside a server-side Graph API call and are never logged or returned to a browser.
 */
export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".")
}

export function decryptSecret(payload: string, key: Buffer): string | null {
  const [version, iv, tag, data] = payload.split(".")
  if (version !== "v1" || !iv || !tag || !data) return null
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"))
    decipher.setAuthTag(Buffer.from(tag, "base64url"))
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}

export function hmacHex(secret: string | Buffer, value: string | Buffer): string {
  return createHmac("sha256", secret).update(value).digest("hex")
}

/** Constant-time string comparison (different lengths are simply unequal). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * X-Hub-Signature-256 check for Meta webhooks: HMAC-SHA256 of the RAW request body with the app secret,
 * sent as "sha256=<lowercase hex>". The raw bytes must be used, never re-serialised JSON.
 */
export function isValidMetaSignature(rawBody: Buffer, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false
  return safeEqual(header.slice("sha256=".length).toLowerCase(), hmacHex(appSecret, rawBody))
}

/** Verifies and decodes a Meta signed_request (data-deletion callback). Returns the payload or null. */
export function parseSignedRequest(signedRequest: string, appSecret: string): Record<string, unknown> | null {
  const [sig, payload] = signedRequest.split(".", 2)
  if (!sig || !payload) return null
  const expected = createHmac("sha256", appSecret).update(payload).digest("base64url")
  if (!safeEqual(sig, expected)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>
    if (String(data.algorithm ?? "").toUpperCase() !== "HMAC-SHA256") return null
    return data
  } catch {
    return null
  }
}
