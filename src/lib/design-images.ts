/**
 * Invitation designs store uploaded pictures as data URLs inside the canvas JSON. Rendering those straight into
 * a page made the public invitation and the owner Preview several megabytes each (the same image also appears
 * twice: once in the HTML and once in the data the browser hydrates from). For read-only rendering we swap each
 * one for a small URL that /api/media/design serves as a real, cacheable image. The version in the URL changes
 * whenever the design is saved, so a replaced picture is never served stale.
 *
 * Only ever use this for display. The editor works on the stored data and must never save these URLs back.
 */

type CanvasObject = Record<string, unknown>
type DesignLike = { canvasJson: unknown; updatedAt: Date }

export function designImageUrl(eventId: string, objectId: string, version: number): string {
  return `/api/media/design/${encodeURIComponent(eventId)}?o=${encodeURIComponent(objectId)}&v=${version}`
}

export function withDesignImageUrls<E extends { id: string; design: DesignLike | null }>(event: E | null): E | null {
  if (!event?.design) return event
  const canvas = event.design.canvasJson as { objects?: unknown } | null
  if (!canvas || !Array.isArray(canvas.objects)) return event

  const version = event.design.updatedAt.getTime()
  const objects = (canvas.objects as unknown[]).map((item) => {
    const o = item as CanvasObject | null
    if (o && o.type === "image" && typeof o.src === "string" && o.src.startsWith("data:") && typeof o.id === "string") {
      return { ...o, src: designImageUrl(event.id, o.id, version) }
    }
    return item
  })
  return { ...event, design: { ...event.design, canvasJson: { ...canvas, objects } } }
}
