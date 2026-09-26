import { notFound } from "next/navigation"
import QRCode from "qrcode"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventAccessRole } from "@/lib/event-access"
import { checkInCode } from "@/lib/checkin-pass"
import { PrintButton } from "@/components/events/print-button"

export const dynamic = "force-dynamic"

/** Printable check-in passes (one QR card per attending guest) to hand out or place at the welcome table. */
export default async function PrintPassesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params
  const role = await getEventAccessRole(user.id, eventId)
  if (!role) notFound()

  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, select: { name: true } })
  const guests = await db.guest.findMany({
    where: { eventId, rsvpStatus: "ATTENDING" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, numberAttending: true, chair: { select: { seatNumber: true, table: { select: { name: true } } } } },
  })
  const cards = await Promise.all(guests.map(async (g) => ({
    ...g,
    qr: await QRCode.toDataURL(checkInCode(g.id, eventId), { errorCorrectionLevel: "M", margin: 2, width: 360, color: { dark: "#1F1A24", light: "#FFFFFF" } }),
  })))

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0">
      <PrintButton />
      <h1 className="font-heading text-2xl font-bold mb-1 break-words">{event.name}</h1>
      <p className="text-neutral-600 mb-6 print:hidden">Check-in passes for {cards.length} attending guest{cards.length === 1 ? "" : "s"}. Scan them with Check-in → Scan check-in QR.</p>
      {cards.length === 0 ? (
        <p className="text-neutral-600">No attending guests yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3">
          {cards.map((g) => (
            <div key={g.id} className="break-inside-avoid rounded-lg border border-neutral-300 p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.qr} alt={`Check-in QR for ${g.firstName}`} className="mx-auto aspect-square w-full max-w-[9rem]" />
              <p className="mt-2 font-semibold leading-tight break-words">{g.firstName} {g.lastName}</p>
              <p className="text-xs text-neutral-600">Party of {Math.max(1, g.numberAttending ?? 1)}{g.chair ? ` · ${g.chair.table.name}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
