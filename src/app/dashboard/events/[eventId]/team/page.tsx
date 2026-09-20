import { redirect } from "next/navigation"
import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { TeamManager } from "@/components/events/team-manager"

export default async function TeamPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user, event } = await getEventContext(eventId)
  if (event.ownerId !== user.id) redirect(`/dashboard/events/${eventId}`)

  const [collaborators, canCollaborate] = await Promise.all([
    db.eventCollaborator.findMany({ relationLoadStrategy: "join", where: { eventId }, include: { user: { select: { id: true, name: true } } }, orderBy: { invitedAt: "desc" } }),
    hasFeature(user.id, eventId, FEATURES.CLIENT_COLLABORATION),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Team &amp; Collaboration</h1>
        <p className="text-muted-foreground text-sm mt-1">Invite coordinators or clients, assign permissions, and hand off ownership.</p>
      </div>
      <TeamManager eventId={eventId} collaborators={JSON.parse(JSON.stringify(collaborators))} canCollaborate={canCollaborate} />
    </div>
  )
}
