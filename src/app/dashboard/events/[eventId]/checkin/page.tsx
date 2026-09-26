import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { CheckInConsole } from "@/components/checkin/checkin-console"

export const dynamic = "force-dynamic"

export default async function CheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  await getEventContext(eventId)

  // Everyone on the list (declined guests hidden by default in the console): people who never answered still show up.
  const guests = await db.guest.findMany({
    relationLoadStrategy: "join",
    where: { eventId },
    select: {
      id: true, firstName: true, lastName: true, category: true, checkedIn: true, checkedInAt: true, numberAttending: true, rsvpStatus: true,
      chair: { select: { seatNumber: true, table: { select: { name: true } } } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Event-Day Check-in</h1>
        <p className="text-muted-foreground text-sm mt-1">Scan guests&apos; check-in QR codes with your phone camera, or search their name.</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a className="text-primary hover:underline" href={`/print/${eventId}/guests`} target="_blank" rel="noreferrer">Print door list (paper backup)</a>
          <a className="text-primary hover:underline" href={`/print/${eventId}/passes`} target="_blank" rel="noreferrer">Print check-in passes</a>
        </p>
      </div>
      <CheckInConsole
        eventId={eventId}
        guests={guests.map((g) => ({
          id: g.id, firstName: g.firstName, lastName: g.lastName, category: g.category, checkedIn: g.checkedIn,
          checkedInAt: g.checkedInAt?.toISOString() ?? null, rsvpStatus: g.rsvpStatus,
          partySize: g.rsvpStatus === "ATTENDING" ? Math.max(1, g.numberAttending ?? 1) : 1,
          seat: g.chair ? `${g.chair.table.name} · Seat ${g.chair.seatNumber}` : null,
        }))}
      />
    </div>
  )
}
