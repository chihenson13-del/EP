import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasUnlimitedAccount } from "@/lib/entitlements"
import { CalendarLockedCard } from "@/components/calendar/calendar-locked-card"
import { BookingCalendar } from "@/components/calendar/booking-calendar"

export const dynamic = "force-dynamic"

export default async function BookingCalendarPage() {
  const user = await requireUser()

  // Server-side enforced: only an APPROVED Unlimited entitlement unlocks calendar data.
  // Never derived from client state, and never inherited from a per-event Pro/Premium plan.
  const unlimited = await hasUnlimitedAccount(user.id)

  if (!unlimited) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <CalendarLockedCard />
      </div>
    )
  }

  const [events, importedEvents] = await Promise.all([
    db.event.findMany({
      where: { ownerId: user.id },
      select: {
        id: true, name: true, type: true, customTypeLabel: true, slug: true, status: true,
        date: true, endDate: true, timeLabel: true, venueName: true, address: true, description: true,
        isPublic: true, createdAt: true,
        _count: { select: { guests: true } },
      },
      orderBy: { date: "asc" },
      take: 2000,
    }),
    db.importedCalendarEvent.findMany({
      where: { userId: user.id },
      orderBy: { startAt: "asc" },
      take: 2000,
    }),
  ])

  const attendingCounts = await db.guest.groupBy({
    by: ["eventId"],
    where: { eventId: { in: events.map((e) => e.id) }, rsvpStatus: "ATTENDING" },
    _count: { _all: true },
  })
  const attendingMap = new Map(attendingCounts.map((a) => [a.eventId, a._count._all]))

  const serializedEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    customTypeLabel: e.customTypeLabel,
    slug: e.slug,
    status: e.status,
    date: e.date ? e.date.toISOString() : null,
    endDate: e.endDate ? e.endDate.toISOString() : null,
    timeLabel: e.timeLabel,
    venueName: e.venueName,
    address: e.address,
    description: e.description,
    isPublic: e.isPublic,
    createdAt: e.createdAt.toISOString(),
    guestCount: e._count.guests,
    attendingCount: attendingMap.get(e.id) ?? 0,
    ownerName: user.name ?? "",
    ownerEmail: user.email ?? "",
  }))

  const serializedImported = importedEvents.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt ? e.endAt.toISOString() : null,
    allDay: e.allDay,
  }))

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-8">
      <BookingCalendar events={serializedEvents} importedEvents={serializedImported} />
    </div>
  )
}
