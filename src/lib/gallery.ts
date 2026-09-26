import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

export type GalleryItem = { id: string; url: string; caption: string | null; hidden: boolean }

/**
 * An event's photos WITHOUT pulling megabytes of base64 out of the database. Uploaded photos are stored as
 * data URLs; for those, the query returns NULL and the image is addressed through the cached media route
 * (/api/media/gallery/[id]) instead. External http(s) photo links are returned as-is.
 */
export async function getGalleryForEvent(eventId: string, opts: { includeHidden?: boolean } = {}): Promise<GalleryItem[]> {
  const rows = await db.$queryRaw<{ id: string; url: string | null; caption: string | null; hidden: boolean; v: number }[]>`
    SELECT id,
           CASE WHEN url LIKE 'data:%' THEN NULL ELSE url END AS url,
           caption,
           hidden,
           length(url) AS v
    FROM "GalleryImage"
    WHERE "eventId" = ${eventId} ${opts.includeHidden ? Prisma.empty : Prisma.sql`AND hidden = false`}
    ORDER BY "order" ASC, "createdAt" ASC`
  // ?v= changes when a photo is edited (its stored data changes length), so a cached old version is never shown.
  return rows.map((r) => ({ id: r.id, url: r.url ?? `/api/media/gallery/${r.id}?v=${Number(r.v)}`, caption: r.caption, hidden: r.hidden }))
}
