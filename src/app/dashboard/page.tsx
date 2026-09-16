import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasUnlimitedAccount } from "@/lib/entitlements"
import { CreateEventDialog } from "@/components/events/create-event-dialog"
import { EventsBoard } from "@/components/events/events-board"

export default async function DashboardPage() {
  const user = await requireUser()

  const [ownedEvents, collaboratorLinks, unlimited] = await Promise.all([
    db.event.findMany({
      where: { ownerId: user.id },
      include: {
        _count: { select: { guests: true } },
        entitlements: { where: { status: "ACTIVE" }, include: { plan: true }, orderBy: { activatedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.eventCollaborator.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        event: {
          include: {
            _count: { select: { guests: true } },
            entitlements: { where: { status: "ACTIVE" }, include: { plan: true }, orderBy: { activatedAt: "desc" }, take: 1 },
          },
        },
      },
    }),
    hasUnlimitedAccount(user.id),
  ])

  const attendingCounts = await db.guest.groupBy({
    by: ["eventId"],
    where: { eventId: { in: ownedEvents.map((e) => e.id) }, rsvpStatus: "ATTENDING" },
    _count: { _all: true },
  })
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
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

      <EventsBoard events={[...events, ...collaboratorEvents]} />
    </div>
  )
}
