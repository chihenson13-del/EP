"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import type { ActionResult } from "@/actions/events"
import type { Prisma } from "@prisma/client"

export async function saveDesign(eventId: string, canvasJson: unknown): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const allowed = await hasFeature(user.id, eventId, FEATURES.CANVA_EDITOR)
  if (!allowed) return { ok: false, error: "The visual editor requires Premium or higher." }

  await db.eventDesign.upsert({
    where: { eventId },
    update: { canvasJson: canvasJson as Prisma.InputJsonValue },
    create: { eventId, canvasJson: canvasJson as Prisma.InputJsonValue },
  })

  revalidatePath(`/dashboard/events/${eventId}/editor`)
  return { ok: true, data: undefined }
}
