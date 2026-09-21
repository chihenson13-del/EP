import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { getEventAccessRole } from "@/lib/event-access"
import { ALLOWED_IMAGE_MIME, isHttpUrl } from "@/lib/image-url"

/**
 * Serves images that are stored as data URLs in the database (gallery photos, payment proofs, the
 * payment QR) as real, cacheable image responses. Inlining them into HTML/RSC payloads made every page
 * that showed a photo several megabytes heavier and un-cacheable.
 *
 * Authorisation mirrors where each image is allowed to appear.
 */

function toResponse(value: string, cacheControl: string): Response {
  if (isHttpUrl(value)) return Response.redirect(value, 302)
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([\s\S]*)$/.exec(value)
  if (!match || !(ALLOWED_IMAGE_MIME as readonly string[]).includes(match[1])) return new Response("Not found", { status: 404 })
  const bytes = Buffer.from(match[2], "base64")
  return new Response(bytes, {
    headers: {
      "Content-Type": match[1],
      "Content-Length": String(bytes.length),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  })
}

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params

  if (kind === "design") {
    // A picture placed on an invitation design. `id` is the event, `o` the design object holding the picture.
    const objectId = new URL(req.url).searchParams.get("o")
    if (!objectId) return new Response("Not found", { status: 404 })
    const design = await db.eventDesign.findUnique({
      relationLoadStrategy: "join",
      where: { eventId: id },
      select: { canvasJson: true, event: { select: { status: true, isPublic: true } } },
    })
    const objects = (design?.canvasJson as { objects?: unknown } | null)?.objects
    const picture = Array.isArray(objects)
      ? (objects as { id?: unknown; type?: unknown; hidden?: unknown; src?: unknown }[]).find((o) => o?.id === objectId && o.type === "image")
      : undefined
    if (!design || typeof picture?.src !== "string") return new Response("Not found", { status: 404 })

    // A content fingerprint lets the browser revalidate with If-None-Match and get an empty 304 instead of the whole picture.
    const etag = `"${createHash("sha1").update(picture.src).digest("base64url").slice(0, 22)}"`
    const respond = (cacheControl: string) => {
      if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": cacheControl } })
      const response = toResponse(picture.src as string, cacheControl)
      if (response.status === 200) response.headers.set("ETag", etag) // a redirect (externally hosted picture) has immutable headers
      return response
    }

    // On a published, public invitation the design is public; before that it is for the event team only.
    if (design.event.status === "PUBLISHED" && design.event.isPublic && !picture.hidden) {
      // The ?v= in the URL changes whenever the design is saved, so a replaced picture is never served stale.
      return respond("public, max-age=3600, stale-while-revalidate=86400")
    }
    const user = await getCurrentUser()
    if (!user || !(await getEventAccessRole(user.id, id))) return new Response("Not found", { status: 404 })
    // Access is checked on every request; only the download is skipped when the picture hasn't changed.
    return respond("private, no-cache")
  }

  if (kind === "gallery") {
    const image = await db.galleryImage.findUnique({
      relationLoadStrategy: "join",
      where: { id },
      select: { url: true, hidden: true, eventId: true, event: { select: { status: true, isPublic: true } } },
    })
    if (!image) return new Response("Not found", { status: 404 })

    // Photos on a published, public invitation are public; anything else (drafts, hidden photos) is for the event team only.
    const isPublicPhoto = !image.hidden && image.event.status === "PUBLISHED" && image.event.isPublic
    if (isPublicPhoto) return toResponse(image.url, "public, max-age=3600, stale-while-revalidate=86400")

    const user = await getCurrentUser()
    if (!user || !(await getEventAccessRole(user.id, image.eventId))) return new Response("Not found", { status: 404 })
    // Draft/hidden photos: revalidate every time, so a shared browser can never replay them to the next user.
    return toResponse(image.url, "private, no-cache")
  }

  const user = await getCurrentUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  if (kind === "proof") {
    const purchase = await db.purchase.findUnique({ where: { id }, select: { proofImageUrl: true, userId: true } })
    if (!purchase?.proofImageUrl) return new Response("Not found", { status: 404 })
    if (purchase.userId !== user.id && user.role !== "ADMIN") return new Response("Not found", { status: 404 })
    // Payment proofs are sensitive: never stored by the browser or any cache.
    return toResponse(purchase.proofImageUrl, "private, no-store")
  }

  if (kind === "qr") {
    const settings = await db.platformSettings.findUnique({ where: { id: "default" }, select: { paymentQrImageUrl: true } })
    if (!settings?.paymentQrImageUrl) return new Response("Not found", { status: 404 })
    // The URL carries ?v=<updatedAt>, so a long private cache is safe: replacing the QR changes the URL.
    return toResponse(settings.paymentQrImageUrl, "private, max-age=86400")
  }

  return new Response("Not found", { status: 404 })
}
