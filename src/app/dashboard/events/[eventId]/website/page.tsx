import Link from "next/link"
import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { WebsiteBuilder } from "@/components/content/website-builder"

export default async function WebsitePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  await getEventContext(eventId)

  const sections = await db.eventSection.findMany({ where: { eventId }, orderBy: { order: "asc" } })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Event Website</h1>
          <p className="text-muted-foreground text-sm mt-1">Add, reorder, hide, and edit the sections on your public page.</p>
        </div>
        <Link href={`/dashboard/events/${eventId}/preview`} className="text-sm text-primary hover:underline">Preview invitation →</Link>
      </div>
      <WebsiteBuilder eventId={eventId} sections={JSON.parse(JSON.stringify(sections))} />
    </div>
  )
}
