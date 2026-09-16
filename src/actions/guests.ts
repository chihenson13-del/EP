"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { getEventLimits, hasFeature, FEATURES } from "@/lib/entitlements"
import { guestSchema, customQuestionSchema, importRowSchema, type GuestInput, type CustomQuestionInput, type ImportRow } from "@/lib/validations/guest"
import type { ActionResult } from "@/actions/events"
import type { RsvpStatus } from "@prisma/client"

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
  return { ok: true, data: { id: guest.id } }
}

export async function deleteGuest(eventId: string, guestId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.guest.deleteMany({ where: { id: guestId, eventId } })
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  return { ok: true, data: undefined }
}

export async function bulkDeleteGuests(eventId: string, guestIds: string[]): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.guest.deleteMany({ where: { eventId, id: { in: guestIds } } })
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  return { ok: true, data: undefined }
}

export async function bulkSetRsvpStatus(eventId: string, guestIds: string[], status: RsvpStatus): Promise<ActionResult> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })
  await db.guest.updateMany({ where: { eventId, id: { in: guestIds } }, data: { rsvpStatus: status, respondedAt: new Date() } })
  revalidatePath(`/dashboard/events/${eventId}/guests`)
  return { ok: true, data: undefined }
}

export async function importGuests(eventId: string, rows: ImportRow[]): Promise<ActionResult<{ imported: number; skipped: number }>> {
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

  for (const raw of rows) {
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
    toCreate.push(row)
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
      })),
    })
    imported = toCreate.length
  }

  revalidatePath(`/dashboard/events/${eventId}/guests`)
  return { ok: true, data: { imported, skipped } }
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
