"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { getEventAccessRole } from "@/lib/event-access"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { sanitizeCanvas } from "@/lib/design-canvas"
import { shrinkCanvasObjects } from "@/lib/shrink-image"
import type { ActionResult } from "@/actions/events"
import type { Prisma } from "@prisma/client"

export async function saveDesign(eventId: string, canvasJson: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const user = await requireUser()
  const role = await getEventAccessRole(user.id, eventId)
  if (role !== "OWNER" && role !== "COORDINATOR" && role !== "CLIENT") {
    return { ok: false, error: "You don't have permission to edit this event." }
  }

  const allowed = await hasFeature(user.id, eventId, FEATURES.CANVA_EDITOR)
  if (!allowed) return { ok: false, error: "The visual editor requires Premium or higher." }

  const sanitized = sanitizeCanvas(canvasJson)
  if (!sanitized.ok) return { ok: false, error: sanitized.error }
  // Large pictures are downscaled here too, so a design never grows the editor and invitation pages back to megabytes.
  const shrunk = await shrinkCanvasObjects(sanitized.data.objects)
  const json = { ...sanitized.data, objects: shrunk.objects } as unknown as Prisma.InputJsonValue

  const saved = await db.eventDesign.upsert({
    where: { eventId },
    update: { canvasJson: json },
    create: { eventId, canvasJson: json },
    select: { updatedAt: true },
  })

  // The saved design shows in the owner's preview and (once published) on the public invitation.
  const event = await db.event.findUnique({ where: { id: eventId }, select: { slug: true } })
  if (event) revalidatePath(`/e/${event.slug}`)
  return { ok: true, data: { savedAt: saved.updatedAt.toISOString() } }
}
