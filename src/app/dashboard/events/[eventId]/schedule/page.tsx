import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { ScheduleManager } from "@/components/content/schedule-manager"

export default async function SchedulePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  await getEventContext(eventId)

  const items = await db.scheduleItem.findMany({ where: { eventId }, orderBy: { order: "asc" } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Event Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">Build a timeline guests will see on your event page.</p>
      </div>
      <ScheduleManager eventId={eventId} items={JSON.parse(JSON.stringify(items))} />
    </div>
  )
}
