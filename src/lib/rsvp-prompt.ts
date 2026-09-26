/**
 * The main RSVP question guests answer ("Will you be joining us?") and its answer choices. Stored per event in
 * EventPage.layout.rsvp, so it can be edited any time without touching existing RSVPs: every choice maps to one of
 * the fixed RSVP statuses (Attending / Declined / Maybe), and a guest's response is stored as that status.
 * Editing or reordering the wording therefore never breaks responses that already came in.
 */

export type RsvpAnswerStatus = "ATTENDING" | "DECLINED" | "MAYBE"
export type RsvpOption = { id: string; label: string; status: RsvpAnswerStatus }
export type RsvpPrompt = { question: string; options: RsvpOption[] }

export const RSVP_STATUS_LABEL: Record<RsvpAnswerStatus, string> = { ATTENDING: "Counts as attending", DECLINED: "Counts as not attending", MAYBE: "Counts as maybe" }

export const DEFAULT_RSVP_PROMPT: RsvpPrompt = {
  question: "Will you be joining us?",
  options: [
    { id: "yes", label: "Yes, I'll be there!", status: "ATTENDING" },
    { id: "no", label: "Sorry, I can't make it.", status: "DECLINED" },
    { id: "maybe", label: "Maybe", status: "MAYBE" },
  ],
}

export const RSVP_LIMITS = { question: 200, label: 80, minOptions: 2, maxOptions: 8 }

const STATUSES = new Set<RsvpAnswerStatus>(["ATTENDING", "DECLINED", "MAYBE"])

/** Read a stored prompt, falling back to the default for anything missing or malformed. */
export function readRsvpPrompt(layout: unknown): RsvpPrompt {
  const raw = (layout as { rsvp?: unknown } | null)?.rsvp
  const parsed = validateRsvpPrompt(raw)
  return parsed.ok ? parsed.data : DEFAULT_RSVP_PROMPT
}

export function validateRsvpPrompt(input: unknown): { ok: true; data: RsvpPrompt } | { ok: false; error: string } {
  const value = (input ?? {}) as { question?: unknown; options?: unknown }
  const question = typeof value.question === "string" ? value.question.trim() : ""
  if (!question) return { ok: false, error: "Write the RSVP question." }
  if (question.length > RSVP_LIMITS.question) return { ok: false, error: `Keep the question under ${RSVP_LIMITS.question} characters.` }
  if (!Array.isArray(value.options)) return { ok: false, error: "Add the answer choices." }

  const seen = new Set<string>()
  const options: RsvpOption[] = []
  for (const item of value.options) {
    const o = (item ?? {}) as { id?: unknown; label?: unknown; status?: unknown }
    const label = typeof o.label === "string" ? o.label.trim() : ""
    const status = o.status as RsvpAnswerStatus
    let id = typeof o.id === "string" && /^[a-z0-9-]{1,24}$/i.test(o.id) ? o.id : ""
    if (!label) return { ok: false, error: "Every answer needs text." }
    if (label.length > RSVP_LIMITS.label) return { ok: false, error: `Keep each answer under ${RSVP_LIMITS.label} characters.` }
    if (!STATUSES.has(status)) return { ok: false, error: "Choose what each answer counts as." }
    if (!id || seen.has(id)) id = `opt-${options.length + 1}-${Math.random().toString(36).slice(2, 6)}`
    seen.add(id)
    options.push({ id, label, status })
  }
  if (options.length < RSVP_LIMITS.minOptions) return { ok: false, error: `Add at least ${RSVP_LIMITS.minOptions} answers.` }
  if (options.length > RSVP_LIMITS.maxOptions) return { ok: false, error: `Use at most ${RSVP_LIMITS.maxOptions} answers.` }
  if (!options.some((o) => o.status === "ATTENDING")) return { ok: false, error: "At least one answer must count as attending." }
  if (!options.some((o) => o.status === "DECLINED")) return { ok: false, error: "At least one answer must count as not attending." }
  return { ok: true, data: { question, options } }
}

/** Choices guests actually see: Maybe answers are hidden when the event doesn't allow "maybe". */
export function visibleRsvpOptions(prompt: RsvpPrompt, allowMaybe: boolean): RsvpOption[] {
  return prompt.options.filter((o) => allowMaybe || o.status !== "MAYBE")
}
