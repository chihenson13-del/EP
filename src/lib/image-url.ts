/** Largest base64 data URL we accept (5MB file → ~6.7M base64 chars). Matches the body limit in next.config.ts. */
export const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000

export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const

const DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/

/** True for a raster image data URL (no SVG — it can carry script) or an http(s) URL. */
export function isSafeImageUrl(value: string): boolean {
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) return false
  if (value.startsWith("data:")) return DATA_IMAGE.test(value)
  return isHttpUrl(value)
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

/** Returns the URL only if it's http(s); otherwise null. Use before rendering user-supplied hrefs. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  return isHttpUrl(value.trim()) ? value.trim() : null
}

export const IMAGE_URL_ERROR = "That image isn't valid. Use a PNG, JPG, WebP or GIF under 5MB."
