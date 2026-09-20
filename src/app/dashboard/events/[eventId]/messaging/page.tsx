import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { MessagingConsole } from "@/components/messaging/messaging-console"

export default async function MessagingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user } = await getEventContext(eventId)

  const [guests, logs, canSms] = await Promise.all([
    db.guest.findMany({ where: { eventId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, rsvpStatus: true }, orderBy: { firstName: "asc" } }),
    db.messageLog.findMany({ relationLoadStrategy: "join", where: { eventId }, include: { guest: { select: { firstName: true, lastName: true, email: true, phone: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    hasFeature(user.id, eventId, FEATURES.SMS_MESSAGING),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Messaging</h1>
        <p className="text-muted-foreground text-sm mt-1">Send invitations and reminders by email or SMS.</p>
      </div>
      <MessagingConsole
        eventId={eventId}
        guests={JSON.parse(JSON.stringify(guests))}
        logs={JSON.parse(JSON.stringify(logs))}
        canSms={canSms}
        providersConfigured={!!process.env.RESEND_API_KEY}
      />
    </div>
  )
}
