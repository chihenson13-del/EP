"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { getEventLimits, hasFeature, FEATURES } from "@/lib/entitlements"
import { guestSchema, customQuestionSchema, importRowSchema, type GuestInput, type CustomQuestionInput, type ImportRow } from "@/lib/validations/guest"
import type { ActionResult } from "@/actions/events"
import type { RsvpStatus } from "@prisma/client"
import { normalizeFacebookUrl } from "@/lib/facebook"
import { readRsvpPrompt } from "@/lib/rsvp-prompt"

export async function upsertGuest(eventId: string, input: GuestInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const parsed = guestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const d = parsed.data

  if (!d.id) {
    const limits = await getEventLimits(user.id, eventId)
    if (limits.maxGuests !== "unlimited") {
      const count = await db.guest.count({ where: { eventId } })
      if (count >= limits.maxGuests) {
        return { ok: false, error: `Your plan allows up to ${limits.maxGuests} guests for this event. Upgrade to add more.` }
      }
    }
  }

  const data = {
    eventId,
    firstName: d.firstName,
    lastName: d.lastName || null,
    email: d.email || null,
    phone: d.phone || null,
    category: d.category || null,
    facebookProfileUrl: normalizeFacebookUrl(d.facebookProfileUrl),
    groupId: d.groupId || null,
    plusOneAllowed: d.plusOneAllowed ?? false,
    maxPlusOnes: d.maxPlusOnes ?? 0,
    childrenCount: d.childrenCount ?? 0,
    mealPreference: d.mealPreference || null,
    dietaryRestrictions: d.dietaryRestrictions || null,
    notes: d.notes || null,
  }

  let guest
  if (d.id) {
    const owned = await db.guest.findFirst({ where: { id: d.id, eventId }, select: { id: true } })
    if (!owned) return { ok: false, error: "Guest not found." }
    guest = await db.guest.update({ where: { id: d.id }, data })
  } else {
    guest = await db.guest.create({ data })
  }

  revalidatePath(`/dashboard/events/${eventId}/guests`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  return { ok: true, data: { id: guest.id } }
}

export async function deleteGuest(eventId: string, guestId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.guest.deleteMany({ where: { id: guestId, eventId } })
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  return { ok: true, data: undefined }
}

export async function bulkDeleteGuests(eventId: string, guestIds: string[]): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.guest.deleteMany({ where: { eventId, id: { in: guestIds } } })
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  return { ok: true, data: undefined }
}

export async function bulkSetRsvpStatus(eventId: string, guestIds: string[], status: RsvpStatus): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  if (!["PENDING", "ATTENDING", "DECLINED", "MAYBE"].includes(status)) return { ok: false, error: "Choose an RSVP status." }
  const ids = Array.isArray(guestIds) ? guestIds.filter((id) => typeof id === "string").slice(0, 2000) : []
  if (!ids.length) return { ok: true, data: undefined }

  // Keep every RSVP field consistent with the new status (answer text, headcount, response times), exactly as
  // if each guest had answered themselves. Only guests of THIS event are touched.
  const page = await db.eventPage.findUnique({ where: { eventId }, select: { layout: true } })
  const answer = readRsvpPrompt(page?.layout).options.find((o) => o.status === status)?.label ?? null
  const where = { eventId, id: { in: ids } }
  const now = new Date()
  if (status === "PENDING") {
    await db.guest.updateMany({ where, data: { rsvpStatus: "PENDING", rsvpAnswer: null, numberAttending: null, respondedAt: null } })
  } else {
    await db.$transaction([
      db.guest.updateMany({ where, data: { rsvpStatus: status, rsvpAnswer: answer, respondedAt: now, ...(status === "ATTENDING" ? {} : { numberAttending: 0 }) } }),
      ...(status === "ATTENDING" ? [db.guest.updateMany({ where: { ...where, OR: [{ numberAttending: null }, { numberAttending: { lt: 1 } }] }, data: { numberAttending: 1 } })] : []),
      db.guest.updateMany({ where: { ...where, rsvpFirstRespondedAt: null }, data: { rsvpFirstRespondedAt: now } }),
    ])
  }
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  return { ok: true, data: undefined }
}

export type ImportResult = {
  imported: number
  skipped: number
  /** Rows imported without their Facebook link because it wasn't a valid Facebook/Messenger URL (1-based file rows). */
  invalidFacebook: Array<{ row: number; name: string }>
}

export async function importGuests(eventId: string, rows: ImportRow[]): Promise<ActionResult<ImportResult>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const canImport = await hasFeature(user.id, eventId, FEATURES.CSV_IMPORT)
  if (!canImport) return { ok: false, error: "CSV/Excel import requires Premium or higher." }

  const limits = await getEventLimits(user.id, eventId)
  const existingCount = await db.guest.count({ where: { eventId } })
  const existingEmails = new Set(
    (await db.guest.findMany({ where: { eventId, email: { not: null } }, select: { email: true } })).map((g) => g.email)
  )

  let imported = 0
  let skipped = 0
  const toCreate: ImportRow[] = []
  const invalidFacebook: ImportResult["invalidFacebook"] = []

  for (const [index, raw] of rows.entries()) {
    const parsed = importRowSchema.safeParse(raw)
    if (!parsed.success) {
      skipped++
      continue
    }
    const row = parsed.data
    if (row.email && existingEmails.has(row.email)) {
      skipped++
      continue
    }
    if (limits.maxGuests !== "unlimited" && existingCount + toCreate.length >= limits.maxGuests) {
      skipped++
      continue
    }
    if (row.email) existingEmails.add(row.email)
    const facebook = normalizeFacebookUrl(row.facebookProfileUrl)
    if (row.facebookProfileUrl && !facebook && invalidFacebook.length < 200) {
      invalidFacebook.push({ row: index + 2, name: `${row.firstName} ${row.lastName ?? ""}`.trim() })
    }
    toCreate.push({ ...row, facebookProfileUrl: facebook ?? undefined })
  }

  if (toCreate.length) {
    await db.guest.createMany({
      data: toCreate.map((row) => ({
        eventId,
        firstName: row.firstName,
        lastName: row.lastName || null,
        email: row.email || null,
        phone: row.phone || null,
        category: row.category || null,
        facebookProfileUrl: row.facebookProfileUrl || null,
      })),
    })
    imported = toCreate.length
  }

  revalidatePath(`/dashboard/events/${eventId}/guests`)
  revalidatePath(`/dashboard/events/${eventId}/rsvps`)
  return { ok: true, data: { imported, skipped, invalidFacebook } }
}

export async function upsertCustomQuestion(eventId: string, input: CustomQuestionInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  const parsed = customQuestionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const d = parsed.data

  if (!d.id) {
    const limits = await getEventLimits(user.id, eventId)
    if (limits.maxCustomQuestions !== "unlimited") {
      const count = await db.customQuestion.count({ where: { eventId } })
      if (count >= limits.maxCustomQuestions) {
        return { ok: false, error: `Your plan allows up to ${limits.maxCustomQuestions} custom RSVP question(s). Upgrade for unlimited questions.` }
      }
    }
  }

  let question
  if (d.id) {
    const owned = await db.customQuestion.findFirst({ where: { id: d.id, eventId }, select: { id: true } })
    if (!owned) return { ok: false, error: "Question not found." }
    question = await db.customQuestion.update({
      where: { id: d.id },
      data: { label: d.label, type: d.type, required: d.required ?? false, options: d.options ?? undefined },
    })
  } else {
    question = await db.customQuestion.create({
      data: { eventId, label: d.label, type: d.type, required: d.required ?? false, options: d.options ?? undefined, order: await db.customQuestion.count({ where: { eventId } }) },
    })
  }

  revalidatePath(`/dashboard/events/${eventId}/rsvp-questions`)
  return { ok: true, data: { id: question.id } }
}

export async function deleteCustomQuestion(eventId: string, questionId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.customQuestion.deleteMany({ where: { id: questionId, eventId } })
  revalidatePath(`/dashboard/events/${eventId}/rsvp-questions`)
  return { ok: true, data: undefined }
}

export async function reorderCustomQuestions(eventId: string, orderedIds: string[]): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.$transaction(
    orderedIds.map((id, order) => db.customQuestion.updateMany({ where: { id, eventId }, data: { order } }))
  )
  revalidatePath(`/dashboard/events/${eventId}/rsvp-questions`)
  return { ok: true, data: undefined }
}
