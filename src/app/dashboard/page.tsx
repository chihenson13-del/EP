import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasUnlimitedAccount } from "@/lib/entitlements"
import { CreateEventDialog } from "@/components/events/create-event-dialog"
import { EventsBoard } from "@/components/events/events-board"
import { BookingCalendarCard } from "@/components/dashboard/booking-calendar-card"
import { getBookingStatus, currentTimestamp } from "@/lib/booking-calendar"

export default async function DashboardPage() {
  const user = await requireUser()

  // Only the columns the event cards and calendar card actually show — not whole event rows.
  const cardSelect = {
    id: true,
    name: true,
    slug: true,
    type: true,
    status: true,
    date: true,
    timeLabel: true,
    venueName: true,
    _count: { select: { guests: true } },
    entitlements: { where: { status: "ACTIVE" as const }, select: { plan: { select: { key: true } } }, orderBy: { activatedAt: "desc" as const }, take: 1 },
  }

  const [ownedEvents, collaboratorLinks, unlimited, attendingCounts] = await Promise.all([
    db.event.findMany({ where: { ownerId: user.id }, select: cardSelect, orderBy: { createdAt: "desc" } }),
    db.eventCollaborator.findMany({
      relationLoadStrategy: "join",
      where: { userId: user.id, status: "ACTIVE" },
      select: { role: true, event: { select: cardSelect } },
    }),
    hasUnlimitedAccount(user.id),
    // Guests attending, per event, in one grouped query (joins through the event so it can run in parallel).
    db.guest.groupBy({
      by: ["eventId"],
      where: { rsvpStatus: "ATTENDING", event: { ownerId: user.id } },
      _count: { _all: true },
    }),
  ])

  const attendingMap = new Map(attendingCounts.map((a) => [a.eventId, a._count._all]))

  const events = ownedEvents.map((e) => ({
    ...e,
    role: "OWNER" as const,
    attendingCount: attendingMap.get(e.id) ?? 0,
    planKey: unlimited ? ("UNLIMITED" as const) : e.entitlements[0]?.plan.key ?? ("FREE" as const),
  }))

  const collaboratorEvents = collaboratorLinks.map((c) => ({
    ...c.event,
    role: c.role,
    attendingCount: 0,
    planKey: c.event.entitlements[0]?.plan.key ?? ("FREE" as const),
  }))

  const firstName = user.name?.split(" ")[0]

  const now = currentTimestamp()
  const upcomingBookings = ownedEvents
    .filter((e) => e.date && e.date.getTime() >= now)
    .filter((e) => getBookingStatus({ status: e.status, date: e.date }) === "CONFIRMED")
    .sort((a, b) => a.date!.getTime() - b.date!.getTime())
    .slice(0, 3)
    .map((e) => ({ id: e.id, name: e.name, date: e.date!.toISOString(), timeLabel: e.timeLabel }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-2xl border border-border/70 bg-card px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Welcome back{firstName ? `, ${firstName}` : ""}</p>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">My Events</h1>
              <p className="text-muted-foreground text-sm mt-2">
                {unlimited ? "Unlimited Access — create as many events as you like." : "Create and manage every event in one place."}
              </p>
            </div>
            <CreateEventDialog />
          </div>
        </div>
        <BookingCalendarCard unlimited={unlimited} upcoming={upcomingBookings} />
      </div>

      <EventsBoard events={[...events, ...collaboratorEvents]} />
    </div>
  )
}
