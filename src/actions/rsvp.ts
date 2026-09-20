"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { rsvpSubmitSchema, type RsvpSubmitInput } from "@/lib/validations/rsvp"
import type { ActionResult } from "@/actions/events"

export async function submitRsvp(input: RsvpSubmitInput): Promise<ActionResult<{ status: string }>> {
  const parsed = rsvpSubmitSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." }
  const d = parsed.data

  const guest = await db.guest.findUnique({
    where: { id: d.guestId },
    include: { event: { include: { customQuestions: true } } },
  })
  // The token must match the guest's own secret RSVP token — this is what actually authorizes
  // a submission, not just knowing the (predictable, server-generated) guest ID.
  if (!guest || guest.rsvpToken !== d.rsvpToken) return { ok: false, error: "This RSVP link is invalid." }

  const event = guest.event
  const now = new Date()
  if (event.rsvpDeadline && now > event.rsvpDeadline && !event.allowLateRsvp) {
    return { ok: false, error: "The RSVP deadline for this event has passed." }
  }
  if (event.status === "ARCHIVED") {
    return { ok: false, error: "This event is no longer accepting RSVPs." }
  }

  const plusOneNames = (d.plusOneNames ?? []).map((n) => n.trim()).filter(Boolean)
  if (d.rsvpStatus === "ATTENDING" && plusOneNames.length > 0) {
    if (!guest.plusOneAllowed) return { ok: false, error: "This invitation doesn't include a plus-one." }
    if (plusOneNames.length > guest.maxPlusOnes) {
      return { ok: false, error: `This invitation allows up to ${guest.maxPlusOnes} plus-one(s).` }
    }
  }
  // Headcount is bounded by what this specific invitation allows — never trust the submitted number.
  const maxAttending = 1 + (guest.plusOneAllowed ? guest.maxPlusOnes : 0)
  const numberAttending = d.rsvpStatus === "ATTENDING" ? Math.min(d.numberAttending ?? 1 + plusOneNames.length, maxAttending) : 0
  // Only answers to THIS event's own questions are stored (blocks writing answers onto another event's questions).
  const validQuestionIds = new Set(event.customQuestions.map((q) => q.id))

  for (const q of event.customQuestions) {
    if (q.required && d.rsvpStatus === "ATTENDING") {
      const answer = d.answers?.[q.id]
      if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
        return { ok: false, error: `Please answer: ${q.label}` }
      }
    }
  }

  await db.$transaction(async (tx) => {
    await tx.guest.update({
      where: { id: guest.id },
      data: {
        rsvpStatus: d.rsvpStatus,
        numberAttending,
        mealPreference: d.mealPreference || guest.mealPreference,
        dietaryRestrictions: d.dietaryRestrictions || guest.dietaryRestrictions,
        respondedAt: new Date(),
      },
    })

    await tx.plusOne.deleteMany({ where: { guestId: guest.id } })
    if (d.rsvpStatus === "ATTENDING" && plusOneNames.length) {
      await tx.plusOne.createMany({
        data: plusOneNames.map((name) => ({ guestId: guest.id, name })),
      })
    }

    if (d.answers) {
      for (const [questionId, value] of Object.entries(d.answers)) {
        if (!validQuestionIds.has(questionId)) continue
        await tx.customAnswer.upsert({
          where: { guestId_questionId: { guestId: guest.id, questionId } },
          update: { value: value as never },
          create: { guestId: guest.id, questionId, value: value as never },
        })
      }
    }
  })

  revalidatePath(`/dashboard/events/${event.id}`)
  revalidatePath(`/dashboard/events/${event.id}/guests`)
  return { ok: true, data: { status: d.rsvpStatus } }
}
