import { db } from "@/lib/db"
import type { RsvpSubmitInput } from "@/lib/validations/rsvp"
import { readRsvpPrompt, visibleRsvpOptions } from "@/lib/rsvp-prompt"
import { isRsvpClosed, readRsvpForm } from "@/lib/rsvp-settings"

type SubmitData = Omit<RsvpSubmitInput, "guestId" | "rsvpToken">

/**
 * Saves one guest's RSVP. Callers have already proven who the guest is (personal token or signed session);
 * everything else is re-checked here against the database: deadline, archived events, plus-one limits,
 * headcount, required questions, and that answers belong to THIS event's questions. The guest row is updated
 * in place (no duplicate response records), so changing an RSVP simply overwrites the previous answer.
 */
export async function applyRsvp(guestId: string, d: SubmitData): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const guest = await db.guest.findUnique({
    relationLoadStrategy: "join",
    where: { id: guestId },
    include: { event: { include: { customQuestions: true, page: { select: { layout: true } } } } },
  })
  if (!guest) return { ok: false, error: "This invitation couldn't be found." }

  const event = guest.event
  if (isRsvpClosed(event)) {
    return { ok: false, error: "The RSVP deadline for this event has passed." }
  }
  if (event.status === "ARCHIVED") return { ok: false, error: "This event is no longer accepting RSVPs." }

  // The chosen answer must be one of the organizer's current choices, and decides the stored status.
  const options = visibleRsvpOptions(readRsvpPrompt(event.page?.layout), event.allowMaybe)
  const option = d.optionId ? options.find((o) => o.id === d.optionId) : options.find((o) => o.status === d.rsvpStatus)
  if (!option) return { ok: false, error: "Please choose one of the answers." }
  const status = option.status

  const form = readRsvpForm(event.page?.layout)
  const plusOneNames = (d.plusOneNames ?? []).map((n) => n.trim()).filter(Boolean)
  if (status === "ATTENDING" && plusOneNames.length > 0) {
    if (!guest.plusOneAllowed) return { ok: false, error: "This invitation doesn't include a plus-one." }
    if (plusOneNames.length > guest.maxPlusOnes) return { ok: false, error: `This invitation allows up to ${guest.maxPlusOnes} plus-one(s).` }
  }
  // Headcount is bounded by what this specific invitation allows — never trust the submitted number.
  const maxAttending = 1 + (guest.plusOneAllowed ? guest.maxPlusOnes : 0)
  const requested = d.numberAttending ?? 1 + plusOneNames.length
  const numberAttending = status === "ATTENDING" ? Math.max(1, Math.min(requested, maxAttending)) : 0

  const validQuestionIds = new Set(event.customQuestions.map((q) => q.id))
  for (const q of event.customQuestions) {
    if (q.required && status === "ATTENDING") {
      const answer = d.answers?.[q.id]
      if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) return { ok: false, error: `Please answer: ${q.label}` }
    }
  }
  if (form.askMeal && form.mealOptions.length && d.mealPreference && !form.mealOptions.includes(d.mealPreference)) {
    return { ok: false, error: "Please choose one of the meal options." }
  }

  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.guest.update({
      where: { id: guest.id },
      data: {
        rsvpStatus: status,
        rsvpAnswer: option.label,
        numberAttending,
        mealPreference: form.askMeal ? d.mealPreference || null : guest.mealPreference,
        dietaryRestrictions: form.askDietary ? d.dietaryRestrictions || null : guest.dietaryRestrictions,
        rsvpMessage: form.askMessage ? d.message?.trim() || null : guest.rsvpMessage,
        respondedAt: now,
        rsvpFirstRespondedAt: guest.rsvpFirstRespondedAt ?? now,
      },
    })

    await tx.plusOne.deleteMany({ where: { guestId: guest.id } })
    if (status === "ATTENDING" && plusOneNames.length) {
      await tx.plusOne.createMany({ data: plusOneNames.map((name) => ({ guestId: guest.id, name })) })
    }

    for (const [questionId, value] of Object.entries(d.answers ?? {})) {
      if (!validQuestionIds.has(questionId)) continue
      await tx.customAnswer.upsert({
        where: { guestId_questionId: { guestId: guest.id, questionId } },
        update: { value: value as never },
        create: { guestId: guest.id, questionId, value: value as never },
      })
    }
  })

  return { ok: true, status }
}
