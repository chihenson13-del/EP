import sharp from "sharp"

/** Pictures bigger than this are re-encoded on the server (typically 2 MB -> ~200 KB) so pages stay light. */
export const SHRINK_ABOVE_BYTES = 400 * 1024
const MAX_DIMENSION = 1600

/**
 * Downscales and re-encodes a large PNG or JPEG data URL. JPEG stays JPEG; PNG becomes WebP so transparency
 * survives. Anything else (GIFs, WebP, external URLs, unreadable data) and anything the re-encode wouldn't make
 * smaller is returned untouched, so this can never make a picture worse or lose it.
 */
export async function shrinkDataUrl(dataUrl: string): Promise<string> {
  const match = /^data:(image\/(?:png|jpeg));base64,([\s\S]*)$/.exec(dataUrl)
  if (!match) return dataUrl
  const bytes = Buffer.from(match[2], "base64")
  if (bytes.length <= SHRINK_ABOVE_BYTES) return dataUrl
  try {
    const pipeline = sharp(bytes, { failOn: "none" })
      .rotate() // honour the camera's orientation before the metadata is dropped
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    const isJpeg = match[1] === "image/jpeg"
    const out = isJpeg ? await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer() : await pipeline.webp({ quality: 85 }).toBuffer()
    if (out.length >= bytes.length) return dataUrl
    return `data:${isJpeg ? "image/jpeg" : "image/webp"};base64,${out.toString("base64")}`
  } catch {
    return dataUrl
  }
}

/** Shrinks every large data-URL picture among a design's objects. Reports whether anything changed. */
export async function shrinkCanvasObjects<T>(objects: T[]): Promise<{ objects: T[]; changed: boolean }> {
  let changed = false
  const next = await Promise.all(
    objects.map(async (item) => {
      const o = item as { type?: unknown; src?: unknown } | null
      if (o && o.type === "image" && typeof o.src === "string" && o.src.startsWith("data:")) {
        const src = await shrinkDataUrl(o.src)
        if (src !== o.src) {
          changed = true
          return { ...o, src } as T
        }
      }
      return item
    }),
  )
  return { objects: next, changed }
}
