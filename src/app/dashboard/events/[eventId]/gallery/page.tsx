import { getEventContext } from "@/lib/event-access"
import { getGalleryForEvent } from "@/lib/gallery"
import { getEventLimits } from "@/lib/entitlements"
import { GalleryManager } from "@/components/content/gallery-manager"

export default async function GalleryPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user } = await getEventContext(eventId)

  const [images, limits] = await Promise.all([
    getGalleryForEvent(eventId, { includeHidden: true }),
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
