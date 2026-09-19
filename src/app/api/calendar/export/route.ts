import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasUnlimitedAccount } from "@/lib/entitlements"
import { toICSDate, escapeICSText } from "@/lib/booking-calendar"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  const unlimited = await hasUnlimitedAccount(user.id)
  if (!unlimited) return new NextResponse("Booking Calendar requires an approved Unlimited plan.", { status: 403 })

  const events = await db.event.findMany({
    where: { ownerId: user.id, status: "PUBLISHED", date: { not: null } },
    select: { id: true, name: true, date: true, endDate: true, timeLabel: true, venueName: true, address: true, description: true, updatedAt: true },
    orderBy: { date: "asc" },
    take: 2000,
  })

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Events Partner//Booking Calendar//EN",
    "CALSCALE:GREGORIAN",
  ]

  for (const event of events) {
    if (!event.date) continue
    const start = new Date(event.date)
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const location = [event.venueName, event.address].filter(Boolean).join(", ")

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@eventspartner.app`,
      `DTSTAMP:${toICSDate(event.updatedAt)}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICSText(event.name)}`,
      ...(event.timeLabel ? [`X-EVENTSPARTNER-TIME:${escapeICSText(event.timeLabel)}`] : []),
      ...(location ? [`LOCATION:${escapeICSText(location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${escapeICSText(event.description)}`] : []),
      "END:VEVENT"
    )
  }

  lines.push("END:VCALENDAR")
  const body = lines.join("\r\n")

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="events-partner-calendar.ics"`,
    },
  })
}
