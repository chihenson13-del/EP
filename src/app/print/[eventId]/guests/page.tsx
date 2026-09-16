import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventAccessRole } from "@/lib/event-access"
import { PrintButton } from "@/components/events/print-button"

export default async function PrintGuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params
  const role = await getEventAccessRole(user.id, eventId)
  if (!role) notFound()

  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } })
  const guests = await db.guest.findMany({ where: { eventId }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-0">
      <PrintButton />
      <h1 className="font-heading text-2xl font-bold mb-1">{event.name}</h1>
      <p className="text-muted-foreground mb-6">Guest list — alphabetical · {guests.length} guests</p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">RSVP</th>
            <th className="py-2 pr-4">Plus-ones</th>
            <th className="py-2">Checked in</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <tr key={g.id} className="border-b">
              <td className="py-1.5 pr-4">{g.firstName} {g.lastName}</td>
              <td className="py-1.5 pr-4">{g.category ?? ""}</td>
              <td className="py-1.5 pr-4">{g.rsvpStatus}</td>
              <td className="py-1.5 pr-4">{g.maxPlusOnes}</td>
              <td className="py-1.5">{g.checkedIn ? "Yes" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
