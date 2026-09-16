import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { InvitationEditor } from "@/components/editor/invitation-editor"
import { UpgradeNotice } from "@/components/payments/upgrade-notice"

export default async function EditorPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) notFound()

  const [design, canEdit, canAi] = await Promise.all([
    db.eventDesign.upsert({ where: { eventId }, update: {}, create: { eventId } }),
    hasFeature(user.id, eventId, FEATURES.CANVA_EDITOR),
    hasFeature(user.id, eventId, FEATURES.AI_GENERATOR),
  ])

  if (!canEdit) {
    return <UpgradeNotice eventId={eventId} featureLabel="The Canva-style invitation editor" />
  }

  return (
    <div className="-m-4 sm:-m-6 lg:m-0">
      <InvitationEditor
        eventId={eventId}
        eventType={event.type}
        design={JSON.parse(JSON.stringify(design))}
        canAi={canAi}
      />
    </div>
  )
}
