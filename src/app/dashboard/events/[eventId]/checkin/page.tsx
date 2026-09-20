import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { CheckInConsole } from "@/components/checkin/checkin-console"

export default async function CheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  await getEventContext(eventId)

  const guests = await db.guest.findMany({
    where: { eventId, rsvpStatus: "ATTENDING" },
    select: { id: true, firstName: true, lastName: true, category: true, checkedIn: true, checkedInAt: true, rsvpToken: true, numberAttending: true },
    orderBy: { firstName: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Event-Day Check-in</h1>
        <p className="text-muted-foreground text-sm mt-1">Search or scan guests in as they arrive.</p>
      </div>
      <CheckInConsole eventId={eventId} guests={JSON.parse(JSON.stringify(guests))} />
    </div>
  )
}
