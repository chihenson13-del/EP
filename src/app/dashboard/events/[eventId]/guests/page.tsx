import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { GuestsTable } from "@/components/guests/guests-table"
import { isMessengerIntegrationLive } from "@/lib/messenger/service"

export default async function GuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { event } = await getEventContext(eventId)

  const guests = await db.guest.findMany({
    relationLoadStrategy: "join",
    where: { eventId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { plusOnes: true, chair: { select: { seatNumber: true, table: { select: { name: true } } } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Guests</h1>
        <p className="text-muted-foreground text-sm mt-1">{guests.length} guest{guests.length === 1 ? "" : "s"} on the list.</p>
      </div>
      <GuestsTable eventId={eventId} eventSlug={event.slug} guests={JSON.parse(JSON.stringify(guests))} messengerLive={isMessengerIntegrationLive()} />
    </div>
  )
}
