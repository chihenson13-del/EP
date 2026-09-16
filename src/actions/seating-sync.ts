"use server"

import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import type { ActionResult } from "@/actions/events"

export type LayoutSync = {
  tables: Array<{ id: string; x: number; y: number; rotation: number }>
  objects: Array<{ id: string; x: number; y: number; rotation: number; width: number; height: number }>
}

/** Bulk-persist position/rotation/size for tables and objects — used by undo/redo and multi-drag commits. */
export async function bulkSyncLayout(eventId: string, layout: LayoutSync): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  await db.$transaction([
    ...layout.tables.map((t) => db.table.updateMany({ where: { id: t.id, eventId }, data: { x: t.x, y: t.y, rotation: t.rotation } })),
    ...layout.objects.map((o) => db.floorObject.updateMany({ where: { id: o.id, eventId }, data: { x: o.x, y: o.y, rotation: o.rotation, width: o.width, height: o.height } })),
  ])

  return { ok: true, data: undefined }
}
