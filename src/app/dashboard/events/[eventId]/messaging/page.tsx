import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { MessagingConsole } from "@/components/messaging/messaging-console"

export default async function MessagingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  await getEventContext(eventId)

  const [guests, logs] = await Promise.all([
    db.guest.findMany({ where: { eventId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, rsvpStatus: true }, orderBy: { firstName: "asc" } }),
    db.messageLog.findMany({ relationLoadStrategy: "join", where: { eventId }, include: { guest: { select: { firstName: true, lastName: true, email: true, phone: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Messaging</h1>
        <p className="text-muted-foreground text-sm mt-1">Send invitations and reminders by email. SMS invitations are coming soon as an optional add-on.</p>
      </div>
      <MessagingConsole
        eventId={eventId}
        guests={JSON.parse(JSON.stringify(guests))}
        logs={JSON.parse(JSON.stringify(logs))}
        providersConfigured={!!process.env.RESEND_API_KEY}
      />
    </div>
  )
}
