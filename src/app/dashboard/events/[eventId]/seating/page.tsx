import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { getEventTypeConfig } from "@/lib/event-types"
import { SeatingEditor } from "@/components/seating/seating-editor"

export default async function SeatingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { event } = await getEventContext(eventId)

  const [existingPlan, tables, floorObjects, guests] = await Promise.all([
    db.floorPlan.findUnique({ where: { eventId } }),
    db.table.findMany({ relationLoadStrategy: "join", where: { eventId }, include: { chairs: { include: { guest: true }, orderBy: { seatNumber: "asc" } } }, orderBy: { createdAt: "asc" } }),
    db.floorObject.findMany({ where: { eventId } }),
    db.guest.findMany({ relationLoadStrategy: "join", where: { eventId }, select: { id: true, firstName: true, lastName: true, rsvpStatus: true, chair: { select: { id: true } } }, orderBy: { firstName: "asc" } }),
  ])

  // New events get their floor plan at creation; only older events need it created on first visit.
  const floorPlan = existingPlan ?? (await db.floorPlan.upsert({ where: { eventId }, update: {}, create: { eventId } }))

  const typeConfig = getEventTypeConfig(event.type)

  return (
    <div className="space-y-4 -m-4 sm:-m-6 lg:m-0">
      <div className="px-4 sm:px-6 lg:px-0 pt-4 sm:pt-6 lg:pt-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Seating &amp; Floor Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">Design tables, chairs, and layout — drag to arrange.</p>
      </div>
      <SeatingEditor
        eventId={eventId}
        floorPlan={JSON.parse(JSON.stringify(floorPlan))}
        initialTables={JSON.parse(JSON.stringify(tables))}
        initialObjects={JSON.parse(JSON.stringify(floorObjects))}
        guests={JSON.parse(JSON.stringify(guests))}
        seatingPresets={typeConfig.seatingPresets}
      />
    </div>
  )
}
