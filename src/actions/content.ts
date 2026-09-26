"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { getEventLimits, hasFeature, FEATURES } from "@/lib/entitlements"
import { isSafeImageUrl, IMAGE_URL_ERROR } from "@/lib/image-url"
import type { ActionResult } from "@/actions/events"
import { Prisma, type SectionType } from "@prisma/client"
import { getTheme, isThemeKey } from "@/lib/themes"
import { isFontKey } from "@/lib/font-keys"
import { FONT_PAIRS } from "@/lib/font-pairs"
import { FONT_ROLES } from "@/lib/theme-resolve"
import { validateRsvpPrompt, type RsvpPrompt } from "@/lib/rsvp-prompt"
import { readRsvpButton, readRsvpForm, readRsvpSection, type RsvpButtonConfig, type RsvpFormConfig } from "@/lib/rsvp-settings"

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

// ── Website sections ────────────────────────────────────────────────────

export async function updateSectionContent(eventId: string, sectionId: string, content: Record<string, unknown>): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const section = await db.eventSection.findFirst({ where: { id: sectionId, eventId }, select: { type: true } })
  if (!section) return { ok: false, error: "Section not found." }
  // The RSVP section has a fixed shape (heading, text, alignment, spacing, background); store only valid values.
  const clean = section.type === "RSVP" ? readRsvpSection(content) : content
  await db.eventSection.updateMany({ where: { id: sectionId, eventId }, data: { content: toJson(clean) } })
  revalidatePath(`/dashboard/events/${eventId}/website`)
  await revalidateInvitation(eventId)
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

export async function duplicateSection(eventId: string, sectionId: string): Promise<ActionResult<{ id: string; order: number }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const source = await db.eventSection.findFirst({ where: { id: sectionId, eventId } })
  if (!source) return { ok: false, error: "Section not found." }
  const count = await db.eventSection.count({ where: { eventId } })
  const created = await db.eventSection.create({ data: { eventId, type: source.type, order: count, visible: source.visible, content: source.content ?? {} }, select: { id: true, order: true } })
  revalidatePath(`/dashboard/events/${eventId}/website`)
  return { ok: true, data: created }
}

// ── Theme ────────────────────────────────────────────────────────────────

/** Merge keys into EventPage.layout without losing the other settings stored there. */
async function mergeLayout(eventId: string, patch: Record<string, unknown>) {
  const page = await db.eventPage.findUnique({ where: { eventId }, select: { layout: true } })
  const layout = { ...((page?.layout as Record<string, unknown> | null) ?? {}), ...patch }
  await db.eventPage.upsert({ where: { eventId }, update: { layout: toJson(layout) }, create: { eventId, layout: toJson(layout) } })
}

async function revalidateInvitation(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/theme`)
  revalidatePath(`/preview/${eventId}`)
  const event = await db.event.findUnique({ where: { id: eventId }, select: { slug: true } })
  if (event) revalidatePath(`/e/${event.slug}`)
}

/**
 * Apply a structured theme (lib/themes.ts). Choosing a theme is a fresh start: earlier custom colors and font
 * choices are cleared, otherwise they would keep overriding the new theme and it would look like nothing changed.
 */
export async function setEventTheme(eventId: string, themeKey: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  if (!isThemeKey(themeKey)) return { ok: false, error: "That theme doesn't exist." }

  const theme = getTheme(themeKey)
  if (theme.isPremium) {
    const allowed = await hasFeature(user.id, eventId, FEATURES.PREMIUM_THEMES)
    if (!allowed) return { ok: false, error: "This is a Premium theme. Upgrade to use it." }
  }

  // Keep the legacy themeId pointing at the matching EventTheme row when one exists (older code paths read it).
  const legacy = await db.eventTheme.findUnique({ where: { key: themeKey }, select: { id: true } })
  await mergeLayout(eventId, { themeKey })
  await db.eventPage.update({ where: { eventId }, data: { themeId: legacy?.id ?? null, colors: Prisma.DbNull, fonts: Prisma.DbNull } })
  await revalidateInvitation(eventId)
  return { ok: true, data: undefined }
}

export async function updateThemeColors(eventId: string, colors: Record<string, string>): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const allowed = await hasFeature(user.id, eventId, FEATURES.ADVANCED_THEME_CUSTOMIZATION)
  if (!allowed) return { ok: false, error: "Custom colors require Premium or higher." }

  const clean = Object.fromEntries(
    Object.entries(colors).filter(([k, v]) => ["primary", "accent", "background"].includes(k) && /^#[0-9a-fA-F]{6}$/.test(v))
  )
  await db.eventPage.upsert({
    where: { eventId },
    update: { colors: Object.keys(clean).length ? toJson(clean) : Prisma.DbNull },
    create: { eventId, colors: toJson(clean) },
  })
  await revalidateInvitation(eventId)
  return { ok: true, data: undefined }
}

/**
 * Fonts: either a quick pairing (pairKey sets heading + body) and/or per-role choices (title, heading, body,
 * rsvp, button, schedule, venue). Only fonts that are actually loaded (FONT_REGISTRY) are accepted.
 */
export async function updateThemeFonts(eventId: string, input: string | { pairKey?: string | null; roles?: Record<string, string | null> }): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const allowed = await hasFeature(user.id, eventId, FEATURES.ADVANCED_THEME_CUSTOMIZATION)
  if (!allowed) return { ok: false, error: "Custom fonts require Premium or higher." }

  const page = await db.eventPage.findUnique({ where: { eventId }, select: { fonts: true } })
  const current = ((page?.fonts as { pairKey?: string; roles?: Record<string, string> } | null) ?? {})
  const next: { pairKey?: string; roles: Record<string, string> } = { pairKey: current.pairKey, roles: { ...(current.roles ?? {}) } }

  const patch: { pairKey?: string | null; roles?: Record<string, string | null> } = typeof input === "string" ? { pairKey: input } : input
  if (patch.pairKey !== undefined) {
    if (patch.pairKey === null) delete next.pairKey
    else if (FONT_PAIRS.some((p) => p.key === patch.pairKey)) { next.pairKey = patch.pairKey; next.roles = {} }
    else return { ok: false, error: "That font pairing doesn't exist." }
  }
  for (const [role, key] of Object.entries(patch.roles ?? {})) {
    if (!FONT_ROLES.some((r) => r.key === role)) return { ok: false, error: "Unknown text style." }
    if (key === null) delete next.roles[role]
    else if (isFontKey(key)) next.roles[role] = key
    else return { ok: false, error: "That font isn't available." }
  }

  await db.eventPage.upsert({ where: { eventId }, update: { fonts: toJson(next) }, create: { eventId, fonts: toJson(next) } })
  await revalidateInvitation(eventId)
  return { ok: true, data: undefined }
}

// ── RSVP question ─────────────────────────────────────────────────────────

export async function updateRsvpPrompt(eventId: string, prompt: unknown): Promise<ActionResult<RsvpPrompt>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const parsed = validateRsvpPrompt(prompt)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  await mergeLayout(eventId, { rsvp: parsed.data })
  revalidatePath(`/dashboard/events/${eventId}/rsvp-questions`)
  await revalidateInvitation(eventId)
  return { ok: true, data: parsed.data }
}

// ── RSVP button, RSVP page and deadline ─────────────────────────────────

async function revalidateRsvp(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/rsvp-questions`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  await revalidateInvitation(eventId)
}

/** The RSVP NOW button on the invitation. Input is normalized field by field (unknown values fall back to defaults). */
export async function updateRsvpButton(eventId: string, input: unknown): Promise<ActionResult<RsvpButtonConfig>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const clean = readRsvpButton({ rsvpButton: input })
  await mergeLayout(eventId, { rsvpButton: clean })
  await revalidateRsvp(eventId)
  return { ok: true, data: clean }
}

/**
 * What the RSVP page asks and how guests find their invitation. The protection level is also mirrored into the
 * existing Event.personalizedRsvpOnly switch (Settings page) so both pages always agree — see lookupMode().
 */
export async function updateRsvpForm(eventId: string, input: unknown): Promise<ActionResult<RsvpFormConfig>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const clean = readRsvpForm({ rsvpForm: input })
  await mergeLayout(eventId, { rsvpForm: clean })
  await db.event.update({ where: { id: eventId }, data: { personalizedRsvpOnly: clean.lookup !== "name" } })
  await revalidateRsvp(eventId)
  return { ok: true, data: clean }
}

/** RSVP deadline (a calendar day, "YYYY-MM-DD", or null for none) and whether late replies are still accepted. */
export async function updateRsvpDeadline(eventId: string, deadline: string | null, allowLateRsvp: boolean): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  if (deadline !== null && (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(new Date(deadline).getTime()))) {
    return { ok: false, error: "Choose a valid date." }
  }
  await db.event.update({ where: { id: eventId }, data: { rsvpDeadline: deadline ? new Date(deadline) : null, allowLateRsvp: !!allowLateRsvp } })
  revalidatePath(`/dashboard/events/${eventId}/settings`)
  await revalidateRsvp(eventId)
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
  if (!isSafeImageUrl(url)) return { ok: false, error: IMAGE_URL_ERROR }
  if (caption && caption.length > 200) return { ok: false, error: "Caption is too long (200 characters max)." }

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

/** Save an edited photo (cropped / rotated / filtered in the browser) and/or its caption. */
export async function updateGalleryImage(eventId: string, id: string, patch: { url?: string; caption?: string | null }): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const data: { url?: string; caption?: string | null } = {}
  if (patch.url !== undefined) {
    if (typeof patch.url !== "string" || !isSafeImageUrl(patch.url)) return { ok: false, error: IMAGE_URL_ERROR }
    data.url = patch.url
  }
  if (patch.caption !== undefined) {
    const caption = typeof patch.caption === "string" ? patch.caption.trim() : ""
    if (caption.length > 200) return { ok: false, error: "Caption is too long (200 characters max)." }
    data.caption = caption || null
  }
  const updated = await db.galleryImage.updateMany({ where: { id, eventId }, data })
  if (!updated.count) return { ok: false, error: "Photo not found." }
  revalidatePath(`/dashboard/events/${eventId}/gallery`)
  await revalidateInvitation(eventId)
  return { ok: true, data: undefined }
}

/** New photo order (ids of THIS event's photos, first to last). */
export async function reorderGallery(eventId: string, orderedIds: string[]): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const ids = Array.isArray(orderedIds) ? orderedIds.filter((x) => typeof x === "string").slice(0, 1000) : []
  await db.$transaction(ids.map((id, order) => db.galleryImage.updateMany({ where: { id, eventId }, data: { order } })))
  revalidatePath(`/dashboard/events/${eventId}/gallery`)
  await revalidateInvitation(eventId)
  return { ok: true, data: undefined }
}
