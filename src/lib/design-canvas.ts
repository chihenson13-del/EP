import { isSafeImageUrl } from "@/lib/image-url"
import { isFontKey } from "@/lib/fonts"
import type { CanvasData, DesignObject } from "@/components/editor/types"

const MAX_OBJECTS = 200
const MAX_TEXT = 2000
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|var\(--[a-z0-9-]+\)|[a-zA-Z]{3,20}|rgba?\([\d\s.,%]+\))$/

function num(value: unknown, fallback: number, min = -20000, max = 20000): number {
  const n = typeof value === "number" ? value : Number.NaN
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function color(value: unknown): string | undefined {
  return typeof value === "string" && COLOR_RE.test(value.trim()) ? value.trim() : undefined
}

/**
 * Validate and normalise canvas JSON coming from the browser. The saved design is rendered on the public
 * invitation, so nothing is trusted: object types are whitelisted, numbers are clamped, colours must look
 * like colours, and images must pass the same safety check as every other upload.
 */
export function sanitizeCanvas(input: unknown): { ok: true; data: CanvasData } | { ok: false; error: string } {
  const raw = (input as { objects?: unknown } | null)?.objects
  if (!Array.isArray(raw)) return { ok: false, error: "The design is malformed." }
  if (raw.length > MAX_OBJECTS) return { ok: false, error: `A design can have at most ${MAX_OBJECTS} elements.` }

  const objects: DesignObject[] = []
  for (const item of raw) {
    const o = (item ?? {}) as Record<string, unknown>
    const type = o.type
    if (type !== "text" && type !== "image" && type !== "rect" && type !== "ellipse") continue

    const obj: DesignObject = {
      id: typeof o.id === "string" ? o.id.slice(0, 40) : Math.random().toString(36).slice(2, 10),
      type,
      x: num(o.x, 0),
      y: num(o.y, 0),
      width: num(o.width, 100, 1, 20000),
      height: num(o.height, 100, 1, 20000),
      rotation: num(o.rotation, 0, -360, 360),
      zIndex: num(o.zIndex, 0, -1000, 1000),
      locked: o.locked === true ? true : undefined,
      hidden: o.hidden === true ? true : undefined,
    }
    if (typeof o.opacity === "number" && o.opacity < 1) obj.opacity = num(o.opacity, 1, 0.05, 1)
    if (type === "text") {
      obj.text = typeof o.text === "string" ? o.text.slice(0, MAX_TEXT) : ""
      obj.fontSize = num(o.fontSize, 24, 4, 400)
      obj.color = color(o.color)
      obj.fontWeight = num(o.fontWeight, 600, 100, 900)
      obj.align = o.align === "left" || o.align === "right" ? o.align : "center"
      if (isFontKey(o.fontKey)) obj.fontKey = o.fontKey
      if (o.italic === true) obj.italic = true
      if (typeof o.letterSpacing === "number") obj.letterSpacing = num(o.letterSpacing, 0, -0.1, 1)
      if (typeof o.lineHeight === "number") obj.lineHeight = num(o.lineHeight, 1.2, 0.8, 3)
      if (o.textTransform === "uppercase" || o.textTransform === "lowercase") obj.textTransform = o.textTransform
      if (o.textShadow === true) obj.textShadow = true
    }
    if (type === "rect" || type === "ellipse") {
      obj.fill = color(o.fill)
      obj.stroke = color(o.stroke)
      obj.strokeWidth = num(o.strokeWidth, 0, 0, 200)
      if (type === "rect") obj.rx = num(o.rx, 0, 0, 2000)
    }
    if (type === "image") {
      const src = typeof o.src === "string" ? o.src : ""
      if (src && !isSafeImageUrl(src)) {
        return { ok: false, error: "One of the images in the design is not supported (use PNG, JPG, WebP, GIF, or an http(s) link)." }
      }
      obj.src = src
      if (typeof o.rx === "number" && o.rx > 0) obj.rx = num(o.rx, 0, 0, 2000)
    }
    objects.push(obj)
  }
  return { ok: true, data: { objects } }
}
