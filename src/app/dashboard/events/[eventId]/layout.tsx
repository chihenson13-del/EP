import Link from "next/link"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventContext } from "@/lib/event-access"
import { EventSidebarNav } from "@/components/events/event-sidebar-nav"
import { EventSwitcher } from "@/components/events/event-switcher"

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventId: string }>
}) {
  const user = await requireUser()
  const { eventId } = await params

  // The event/role lookup is shared (memoised) with the page below, so it costs one round trip in total.
  const [{ event, role }, myEvents] = await Promise.all([
    getEventContext(eventId),
    db.event.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, type: true, status: true } }),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 shrink-0 space-y-4">
          <EventSwitcher events={myEvents} currentId={event.id} />
          <EventSidebarNav eventId={event.id} role={role} />
          {event.status === "PUBLISHED" && event.isPublic && (
            <Link href={`/e/${event.slug}`} target="_blank" className="block text-xs text-primary hover:underline px-1">
              View published page →
            </Link>
          )}
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
