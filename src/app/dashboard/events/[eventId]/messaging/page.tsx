import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { MessagingConsole } from "@/components/messaging/messaging-console"

export default async function MessagingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, name: true } })
  if (!event) notFound()

  const [guests, logs, canSms] = await Promise.all([
    db.guest.findMany({ where: { eventId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, rsvpStatus: true }, orderBy: { firstName: "asc" } }),
    db.messageLog.findMany({ where: { eventId }, include: { guest: true }, orderBy: { createdAt: "desc" }, take: 100 }),
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
