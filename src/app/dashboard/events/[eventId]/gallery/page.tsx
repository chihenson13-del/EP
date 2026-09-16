import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventLimits } from "@/lib/entitlements"
import { GalleryManager } from "@/components/content/gallery-manager"

export default async function GalleryPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) notFound()

  const [images, limits] = await Promise.all([
    db.galleryImage.findMany({ where: { eventId }, orderBy: { order: "asc" } }),
    getEventLimits(user.id, eventId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Photo Gallery</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {images.length} image{images.length === 1 ? "" : "s"}
          {limits.maxGalleryImages !== "unlimited" && ` · up to ${limits.maxGalleryImages} on your plan`}
        </p>
      </div>
      <GalleryManager eventId={eventId} images={JSON.parse(JSON.stringify(images))} />
    </div>
  )
}
