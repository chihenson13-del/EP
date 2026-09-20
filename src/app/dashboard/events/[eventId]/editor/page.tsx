import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { InvitationEditor } from "@/components/editor/invitation-editor"
import { UpgradeNotice } from "@/components/payments/upgrade-notice"

export default async function EditorPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user } = await getEventContext(eventId)

  const [savedDesign, canEdit] = await Promise.all([
    db.eventDesign.findUnique({ where: { eventId } }),
    hasFeature(user.id, eventId, FEATURES.CANVA_EDITOR),
  ])

  // A design row is created with the event; fall back to a blank canvas (saved on first Save) for older events.
  const design = savedDesign ?? { width: 1000, height: 1400, canvasJson: { objects: [] } }

  if (!canEdit) {
    return <UpgradeNotice eventId={eventId} featureLabel="The Canva-style invitation editor" />
  }

  return (
    <div className="-m-4 sm:-m-6 lg:m-0">
      <InvitationEditor
        eventId={eventId}
        design={JSON.parse(JSON.stringify(design))}
      />
    </div>
  )
}
