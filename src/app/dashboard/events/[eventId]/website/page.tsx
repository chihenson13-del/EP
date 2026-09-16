import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { WebsiteBuilder } from "@/components/content/website-builder"

export default async function WebsitePage({ params }: { params: Promise<{ eventId: string }> }) {
  await requireUser()
  const { eventId } = await params
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, slug: true, name: true } })
  if (!event) notFound()

  const sections = await db.eventSection.findMany({ where: { eventId }, orderBy: { order: "asc" } })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Event Website</h1>
          <p className="text-muted-foreground text-sm mt-1">Add, reorder, hide, and edit the sections on your public page.</p>
        </div>
        <a href={`/e/${event.slug}`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Preview public page →</a>
      </div>
      <WebsiteBuilder eventId={eventId} sections={JSON.parse(JSON.stringify(sections))} />
    </div>
  )
}
