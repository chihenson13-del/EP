import { getEventContext } from "@/lib/event-access"
import { PreviewFrame } from "@/components/events/preview-frame"

export default async function EventPreviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { event, role } = await getEventContext(eventId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Preview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          This is your real invitation with everything you&apos;ve saved so far — theme, fonts, colours, sections, schedule, photos and music.
        </p>
      </div>
      <PreviewFrame
        eventId={event.id}
        slug={event.slug}
        status={event.status}
        isPublic={event.isPublic}
        canPublish={role === "OWNER" || role === "COORDINATOR"}
      />
    </div>
  )
}
