import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventAccessRole } from "@/lib/event-access"
import { PrintButton } from "@/components/events/print-button"

export default async function PrintSeatingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params
  const role = await getEventAccessRole(user.id, eventId)
  if (!role) notFound()

  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } })
  const tables = await db.table.findMany({
    where: { eventId },
    include: { chairs: { include: { guest: true }, orderBy: { seatNumber: "asc" } } },
    orderBy: { number: "asc" },
  })

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-0">
      <PrintButton />
      <h1 className="font-heading text-2xl font-bold mb-1">{event.name}</h1>
      <p className="text-muted-foreground mb-6">Seating assignments by table</p>
      <div className="space-y-6">
        {tables.map((t) => (
          <div key={t.id} className="break-inside-avoid">
            <h2 className="font-semibold border-b pb-1 mb-2">{t.name} <span className="text-muted-foreground font-normal text-sm">— {t.chairs.filter((c) => c.guestId).length}/{t.capacity} seated</span></h2>
            <ul className="text-sm grid grid-cols-2 gap-x-4">
              {t.chairs.map((c) => (
                <li key={c.id} className="py-0.5">Seat {c.seatNumber}: {c.guest ? `${c.guest.firstName} ${c.guest.lastName ?? ""}` : <span className="text-muted-foreground">Empty</span>}</li>
              ))}
            </ul>
          </div>
        ))}
        {tables.length === 0 && <p className="text-muted-foreground">No tables have been created yet.</p>}
      </div>
    </div>
  )
}
