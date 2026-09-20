import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { getEventAccessRole } from "@/lib/event-access"
import { toCsv } from "@/lib/csv"

const csv = toCsv

export async function GET(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { eventId } = await params
  const role = await getEventAccessRole(user.id, eventId)
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const url = new URL(req.url)
  const type = url.searchParams.get("type") ?? "guests"
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } })

  let filename = "export.csv"
  let body = ""

  if (type === "guests") {
    const guests = await db.guest.findMany({ where: { eventId }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
    body = csv([
      ["First Name", "Last Name", "Email", "Phone", "Category", "RSVP Status", "Plus-Ones Allowed", "Meal Preference", "Dietary Restrictions", "Checked In"],
      ...guests.map((g) => [g.firstName, g.lastName ?? "", g.email ?? "", g.phone ?? "", g.category ?? "", g.rsvpStatus, g.maxPlusOnes, g.mealPreference ?? "", g.dietaryRestrictions ?? "", g.checkedIn ? "Yes" : "No"]),
    ])
    filename = `guests-${event.slug}.csv`
  } else if (type === "rsvp") {
    const guests = await db.guest.findMany({ where: { eventId }, include: { plusOnes: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
    body = csv([
      ["First Name", "Last Name", "RSVP Status", "Number Attending", "Plus-Ones", "Responded At"],
      ...guests.map((g) => [g.firstName, g.lastName ?? "", g.rsvpStatus, g.numberAttending ?? 0, g.plusOnes.map((p) => p.name).join("; "), g.respondedAt ? g.respondedAt.toISOString() : ""]),
    ])
    filename = `rsvp-report-${event.slug}.csv`
  } else if (type === "seating") {
    const tables = await db.table.findMany({ where: { eventId }, include: { chairs: { include: { guest: true }, orderBy: { seatNumber: "asc" } } }, orderBy: { number: "asc" } })
    body = csv([
      ["Table", "Seat", "Guest", "Status"],
      ...tables.flatMap((t) => t.chairs.map((c) => [t.name, c.seatNumber, c.guest ? `${c.guest.firstName} ${c.guest.lastName ?? ""}`.trim() : "", c.status])),
    ])
    filename = `seating-${event.slug}.csv`
  } else {
    return NextResponse.json({ error: "Unknown export type" }, { status: 400 })
  }

  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${filename}"` },
  })
}
