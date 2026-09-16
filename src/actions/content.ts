"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { getEventLimits, hasFeature, FEATURES } from "@/lib/entitlements"
import type { ActionResult } from "@/actions/events"
import type { SectionType, Prisma } from "@prisma/client"

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

// ── Website sections ────────────────────────────────────────────────────

export async function updateSectionContent(eventId: string, sectionId: string, content: Record<string, unknown>): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.eventSection.updateMany({ where: { id: sectionId, eventId }, data: { content: toJson(content) } })
  revalidatePath(`/dashboard/events/${eventId}/website`)
  revalidatePath(`/e`)
  return { ok: true, data: undefined }
}

export async function toggleSectionVisibility(eventId: string, sectionId: string, visible: boolean): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.eventSection.updateMany({ where: { id: sectionId, eventId }, data: { visible } })
  revalidatePath(`/dashboard/events/${eventId}/website`)
  return { ok: true, data: undefined }
}

export async function reorderSections(eventId: string, orderedIds: string[]): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.$transaction(orderedIds.map((id, order) => db.eventSection.updateMany({ where: { id, eventId }, data: { order } })))
  revalidatePath(`/dashboard/events/${eventId}/website`)
  return { ok: true, data: undefined }
}

export async function addSection(eventId: string, type: SectionType): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const count = await db.eventSection.count({ where: { eventId } })
  const section = await db.eventSection.create({ data: { eventId, type, order: count, visible: true, content: {} } })
  revalidatePath(`/dashboard/events/${eventId}/website`)
  return { ok: true, data: { id: section.id } }
}

export async function deleteSection(eventId: string, sectionId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.eventSection.deleteMany({ where: { id: sectionId, eventId } })
  revalidatePath(`/dashboard/events/${eventId}/website`)
  return { ok: true, data: undefined }
}

export async function duplicateSection(eventId: string, sectionId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const source = await db.eventSection.findFirst({ where: { id: sectionId, eventId } })
  if (!source) return { ok: false, error: "Section not found." }
  const count = await db.eventSection.count({ where: { eventId } })
  await db.eventSection.create({ data: { eventId, type: source.type, order: count, visible: source.visible, content: source.content ?? {} } })
  revalidatePath(`/dashboard/events/${eventId}/website`)
  return { ok: true, data: undefined }
}

// ── Theme ────────────────────────────────────────────────────────────────

export async function setEventTheme(eventId: string, themeId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const theme = await db.eventTheme.findUniqueOrThrow({ where: { id: themeId } })
  if (theme.isPremium) {
    const allowed = await hasFeature(user.id, eventId, FEATURES.PREMIUM_THEMES)
    if (!allowed) return { ok: false, error: "This is a Premium theme. Upgrade to use it." }
  }

  await db.eventPage.upsert({
    where: { eventId },
    update: { themeId },
    create: { eventId, themeId },
  })
  revalidatePath(`/dashboard/events/${eventId}/theme`)
  revalidatePath(`/e`)
  return { ok: true, data: undefined }
}

export async function updateThemeColors(eventId: string, colors: Record<string, string>): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const allowed = await hasFeature(user.id, eventId, FEATURES.ADVANCED_THEME_CUSTOMIZATION)
  if (!allowed) return { ok: false, error: "Custom colors require Premium or higher." }

  await db.eventPage.upsert({
    where: { eventId },
    update: { colors: toJson(colors) },
    create: { eventId, colors: toJson(colors) },
  })
  revalidatePath(`/dashboard/events/${eventId}/theme`)
  revalidatePath(`/e`)
  return { ok: true, data: undefined }
}

export async function updateThemeFonts(eventId: string, pairKey: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const allowed = await hasFeature(user.id, eventId, FEATURES.ADVANCED_THEME_CUSTOMIZATION)
  if (!allowed) return { ok: false, error: "Custom font pairing requires Premium or higher." }

  await db.eventPage.upsert({
    where: { eventId },
    update: { fonts: toJson({ pairKey }) },
    create: { eventId, fonts: toJson({ pairKey }) },
  })
  revalidatePath(`/dashboard/events/${eventId}/theme`)
  revalidatePath(`/e`)
  return { ok: true, data: undefined }
}

// ── Schedule ─────────────────────────────────────────────────────────────

export async function upsertScheduleItem(eventId: string, item: { id?: string; time: string; title: string; description?: string; location?: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  if (item.id) {
    const owned = await db.scheduleItem.findFirst({ where: { id: item.id, eventId } })
    if (!owned) return { ok: false, error: "Schedule item not found." }
    await db.scheduleItem.update({ where: { id: item.id }, data: { time: item.time, title: item.title, description: item.description, location: item.location } })
    revalidatePath(`/dashboard/events/${eventId}/schedule`)
    return { ok: true, data: { id: item.id } }
  }

  const count = await db.scheduleItem.count({ where: { eventId } })
  const created = await db.scheduleItem.create({ data: { eventId, time: item.time, title: item.title, description: item.description, location: item.location, order: count } })
  revalidatePath(`/dashboard/events/${eventId}/schedule`)
  return { ok: true, data: { id: created.id } }
}

export async function deleteScheduleItem(eventId: string, id: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.scheduleItem.deleteMany({ where: { id, eventId } })
  revalidatePath(`/dashboard/events/${eventId}/schedule`)
  return { ok: true, data: undefined }
}

// ── Gallery ──────────────────────────────────────────────────────────────

export async function addGalleryImage(eventId: string, url: string, caption?: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const limits = await getEventLimits(user.id, eventId)
  if (limits.maxGalleryImages !== "unlimited") {
    const count = await db.galleryImage.count({ where: { eventId } })
    if (count >= limits.maxGalleryImages) return { ok: false, error: `Your plan allows up to ${limits.maxGalleryImages} gallery images.` }
  }

  const count = await db.galleryImage.count({ where: { eventId } })
  const image = await db.galleryImage.create({ data: { eventId, url, caption, order: count } })
  revalidatePath(`/dashboard/events/${eventId}/gallery`)
  return { ok: true, data: { id: image.id } }
}

export async function deleteGalleryImage(eventId: string, id: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.galleryImage.deleteMany({ where: { id, eventId } })
  revalidatePath(`/dashboard/events/${eventId}/gallery`)
  return { ok: true, data: undefined }
}

export async function toggleGalleryImageVisibility(eventId: string, id: string, hidden: boolean): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.galleryImage.updateMany({ where: { id, eventId }, data: { hidden } })
  revalidatePath(`/dashboard/events/${eventId}/gallery`)
  return { ok: true, data: undefined }
}
