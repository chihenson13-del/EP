"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { getEventLimits } from "@/lib/entitlements"
import { TABLE_SHAPE_DEFAULTS, computeChairLayout } from "@/lib/seating"
import type { ActionResult } from "@/actions/events"
import type { TableShape, ChairStyle, SeatStatus, FloorObjectType } from "@prisma/client"

function path(eventId: string) {
  return `/dashboard/events/${eventId}/seating`
}

export async function createTable(eventId: string, shape: TableShape, x = 200, y = 200): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const limits = await getEventLimits(user.id, eventId)
  if (limits.maxTables !== "unlimited") {
    const count = await db.table.count({ where: { eventId } })
    if (count >= limits.maxTables) {
      return { ok: false, error: `Your plan allows up to ${limits.maxTables} tables. Upgrade for more.` }
    }
  }

  const defaults = TABLE_SHAPE_DEFAULTS[shape]
  const number = (await db.table.count({ where: { eventId } })) + 1
  const chairs = computeChairLayout(shape, defaults.width, defaults.height, defaults.capacity, 10)

  const table = await db.table.create({
    data: {
      eventId, name: `Table ${number}`, number, shape,
      width: defaults.width, height: defaults.height, capacity: defaults.capacity,
      x, y,
      chairs: { create: chairs.map((c, i) => ({ seatNumber: i + 1, x: c.x, y: c.y, rotation: c.rotation })) },
    },
  })

  revalidatePath(path(eventId))
  return { ok: true, data: { id: table.id } }
}

export async function updateTablePosition(eventId: string, tableId: string, x: number, y: number, rotation?: number): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.table.updateMany({ where: { id: tableId, eventId }, data: { x, y, ...(rotation !== undefined ? { rotation } : {}) } })
  return { ok: true, data: undefined }
}

export type TableSettingsInput = {
  name?: string
  number?: number
  shape?: TableShape
  capacity?: number
  color?: string
  borderColor?: string
  borderWidth?: number
  labelVisible?: boolean
  locked?: boolean
  seatSpacing?: number
}

export async function updateTableSettings(eventId: string, tableId: string, patch: TableSettingsInput): Promise<ActionResult<{ chairsRegenerated: boolean }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const table = await db.table.findFirst({ where: { id: tableId, eventId } })
  if (!table) return { ok: false, error: "Table not found." }

  const shapeChanged = patch.shape && patch.shape !== table.shape
  const capacityChanged = patch.capacity !== undefined && patch.capacity !== table.capacity
  const nextShape = patch.shape ?? table.shape
  const nextCapacity = patch.capacity ?? table.capacity
  const nextWidth = shapeChanged ? TABLE_SHAPE_DEFAULTS[nextShape].width : table.width
  const nextHeight = shapeChanged ? TABLE_SHAPE_DEFAULTS[nextShape].height : table.height
  const nextSpacing = patch.seatSpacing ?? table.seatSpacing

  await db.table.update({
    where: { id: tableId },
    data: {
      name: patch.name, number: patch.number, shape: patch.shape, capacity: patch.capacity,
      width: shapeChanged ? nextWidth : undefined, height: shapeChanged ? nextHeight : undefined,
      color: patch.color, borderColor: patch.borderColor, borderWidth: patch.borderWidth,
      labelVisible: patch.labelVisible, locked: patch.locked, seatSpacing: patch.seatSpacing,
    },
  })

  const regenerate = shapeChanged || capacityChanged
  if (regenerate && nextShape !== "CUSTOM") {
    const existingChairs = await db.chair.findMany({ where: { tableId }, orderBy: { seatNumber: "asc" } })
    const layout = computeChairLayout(nextShape, nextWidth, nextHeight, nextCapacity, nextSpacing)

    await db.$transaction(async (tx) => {
      // Preserve guest assignments on the first N seats; drop or add seats to match new capacity.
      for (let i = 0; i < Math.max(existingChairs.length, layout.length); i++) {
        const pos = layout[i]
        const existing = existingChairs[i]
        if (pos && existing) {
          await tx.chair.update({ where: { id: existing.id }, data: { x: pos.x, y: pos.y, rotation: pos.rotation, seatNumber: i + 1 } })
        } else if (pos && !existing) {
          await tx.chair.create({ data: { tableId, seatNumber: i + 1, x: pos.x, y: pos.y, rotation: pos.rotation } })
        } else if (!pos && existing) {
          await tx.chair.delete({ where: { id: existing.id } })
        }
      }
    })
  }

  revalidatePath(path(eventId))
  return { ok: true, data: { chairsRegenerated: regenerate } }
}

export async function deleteTable(eventId: string, tableId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.table.deleteMany({ where: { id: tableId, eventId } })
  revalidatePath(path(eventId))
  return { ok: true, data: undefined }
}

export async function duplicateTable(eventId: string, tableId: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const limits = await getEventLimits(user.id, eventId)
  if (limits.maxTables !== "unlimited") {
    const count = await db.table.count({ where: { eventId } })
    if (count >= limits.maxTables) return { ok: false, error: `Your plan allows up to ${limits.maxTables} tables.` }
  }

  const source = await db.table.findFirst({ relationLoadStrategy: "join", where: { id: tableId, eventId }, include: { chairs: true } })
  if (!source) return { ok: false, error: "Table not found." }

  const number = (await db.table.count({ where: { eventId } })) + 1
  const created = await db.table.create({
    data: {
      eventId, name: `${source.name} copy`, number, shape: source.shape,
      width: source.width, height: source.height, capacity: source.capacity,
      x: source.x + 40, y: source.y + 40, color: source.color, borderColor: source.borderColor,
      borderWidth: source.borderWidth, seatSpacing: source.seatSpacing,
      chairs: { create: source.chairs.map((c) => ({ seatNumber: c.seatNumber, x: c.x, y: c.y, rotation: c.rotation, style: c.style })) },
    },
  })

  revalidatePath(path(eventId))
  return { ok: true, data: { id: created.id } }
}

export async function updateChair(eventId: string, chairId: string, patch: { x?: number; y?: number; rotation?: number; style?: ChairStyle; status?: SeatStatus; notes?: string }): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const chair = await db.chair.findFirst({ where: { id: chairId, table: { eventId } } })
  if (!chair) return { ok: false, error: "Seat not found." }
  await db.chair.update({ where: { id: chairId }, data: patch })
  revalidatePath(path(eventId))
  return { ok: true, data: undefined }
}

export async function assignGuestToChair(eventId: string, chairId: string, guestId: string | null): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const chair = await db.chair.findFirst({ where: { id: chairId, table: { eventId } } })
  if (!chair) return { ok: false, error: "Seat not found." }
  if (guestId) {
    // The guest must belong to THIS event: never seat (or unseat) a guest from someone else's list.
    const guest = await db.guest.findFirst({ where: { id: guestId, eventId }, select: { id: true } })
    if (!guest) return { ok: false, error: "Guest not found on this event's list." }
  }

  await db.$transaction(async (tx) => {
    if (guestId) {
      await tx.chair.updateMany({ where: { guestId, id: { not: chairId } }, data: { guestId: null, status: "EMPTY" } })
    }
    await tx.chair.update({
      where: { id: chairId },
      data: { guestId, status: guestId ? (chair.status === "VIP" || chair.status === "RESERVED" ? chair.status : "ASSIGNED") : "EMPTY" },
    })
  })

  revalidatePath(path(eventId))
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  return { ok: true, data: undefined }
}

export async function createFloorObject(eventId: string, type: FloorObjectType, x = 200, y = 200, width = 120, height = 80): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const obj = await db.floorObject.create({ data: { eventId, type, label: type.replace(/_/g, " "), x, y, width, height } })
  revalidatePath(path(eventId))
  return { ok: true, data: { id: obj.id } }
}

export async function updateFloorObject(eventId: string, objectId: string, patch: { x?: number; y?: number; width?: number; height?: number; rotation?: number; label?: string; color?: string; locked?: boolean }): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.floorObject.updateMany({ where: { id: objectId, eventId }, data: patch })
  revalidatePath(path(eventId))
  return { ok: true, data: undefined }
}

export async function deleteFloorObject(eventId: string, objectId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.floorObject.deleteMany({ where: { id: objectId, eventId } })
  revalidatePath(path(eventId))
  return { ok: true, data: undefined }
}
