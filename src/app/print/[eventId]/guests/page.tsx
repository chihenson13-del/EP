import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventAccessRole } from "@/lib/event-access"
import { PrintButton } from "@/components/events/print-button"

const STATUS: Record<string, string> = { ATTENDING: "Attending", DECLINED: "Not attending", MAYBE: "Maybe", PENDING: "No RSVP" }

/** Door list for the event day: a paper backup of check-in with party size, table and a tick box per guest. */
export default async function PrintGuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params
  const role = await getEventAccessRole(user.id, eventId)
  if (!role) notFound()

  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, select: { name: true } })
  const guests = await db.guest.findMany({
    where: { eventId },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, category: true, rsvpStatus: true, numberAttending: true, checkedIn: true, chair: { select: { seatNumber: true, table: { select: { name: true } } } } },
  })
  const attending = guests.filter((g) => g.rsvpStatus === "ATTENDING")
  const people = attending.reduce((n, g) => n + Math.max(1, g.numberAttending ?? 1), 0)

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 print:p-0">
      <PrintButton />
      <h1 className="font-heading text-2xl font-bold mb-1 break-words">{event.name}</h1>
      <p className="text-neutral-600 mb-6">Door list — alphabetical · {guests.length} guests · {attending.length} attending ({people} people)</p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-2 w-8" aria-label="Arrived" />
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Party</th>
            <th className="py-2 pr-4">Table</th>
            <th className="py-2">RSVP</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <tr key={g.id} className="border-b break-inside-avoid">
              <td className="py-1.5 pr-2"><span className="inline-block size-4 border border-neutral-500 align-middle text-center leading-4 text-xs">{g.checkedIn ? "✓" : ""}</span></td>
              <td className="py-1.5 pr-4">{g.firstName} {g.lastName}{g.category ? <span className="text-neutral-500"> · {g.category}</span> : null}</td>
              <td className="py-1.5 pr-4">{g.rsvpStatus === "ATTENDING" ? Math.max(1, g.numberAttending ?? 1) : "—"}</td>
              <td className="py-1.5 pr-4">{g.chair ? `${g.chair.table.name} · #${g.chair.seatNumber}` : ""}</td>
              <td className="py-1.5">{STATUS[g.rsvpStatus] ?? g.rsvpStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
