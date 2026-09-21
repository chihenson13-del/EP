import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { InvitationEditor } from "@/components/editor/invitation-editor"
import { UpgradeNotice } from "@/components/payments/upgrade-notice"
import { shrinkCanvasObjects } from "@/lib/shrink-image"
import type { Prisma } from "@prisma/client"

export default async function EditorPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user, role } = await getEventContext(eventId)

  const [savedDesign, canEdit] = await Promise.all([
    db.eventDesign.findUnique({ where: { eventId } }),
    hasFeature(user.id, eventId, FEATURES.CANVA_EDITOR),
  ])

  if (!canEdit) {
    return <UpgradeNotice eventId={eventId} featureLabel="The Canva-style invitation editor" />
  }

  // A design row is created with the event; fall back to a blank canvas (saved on first Save) for older events.
  let design: { width: number; height: number; canvasJson: unknown } = savedDesign ?? { width: 1000, height: 1400, canvasJson: { objects: [] } }

  // Pictures uploaded before uploads were compressed can be several megabytes each and are sent to the browser
  // twice. Shrink them once, here, and keep the smaller copy (only if the design hasn't changed in the meantime).
  const objects = (savedDesign?.canvasJson as { objects?: unknown } | null)?.objects
  if (savedDesign && Array.isArray(objects)) {
    const shrunk = await shrinkCanvasObjects(objects)
    if (shrunk.changed) {
      const canvasJson = { ...(savedDesign.canvasJson as object), objects: shrunk.objects }
      // Only people who can edit the design may change what is stored; everyone else just sees the lighter copy.
      if (role === "OWNER" || role === "COORDINATOR" || role === "CLIENT") {
        await db.eventDesign.updateMany({
          where: { eventId, updatedAt: savedDesign.updatedAt },
          data: { canvasJson: canvasJson as Prisma.InputJsonValue },
        })
      }
      design = { ...savedDesign, canvasJson }
    }
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
