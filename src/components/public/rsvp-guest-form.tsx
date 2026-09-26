import { readRsvpPrompt, visibleRsvpOptions } from "@/lib/rsvp-prompt"
import { readRsvpForm } from "@/lib/rsvp-settings"
import type { RsvpEvent, loadGuestForForm } from "@/lib/rsvp-page-data"
import type { ResolvedTheme } from "@/lib/theme-resolve"
import { RsvpForm, type RsvpFormMode } from "@/components/public/rsvp-form"
import { isDeadlinePassed, rsvpSummary } from "@/components/public/rsvp-shell"
import { checkInCode } from "@/lib/checkin-pass"

type Loaded = NonNullable<Awaited<ReturnType<typeof loadGuestForForm>>>

/** Server wrapper: turns one guest's database record + the host's settings into the RSVP form's props. */
export function RsvpGuestForm({ event, theme, loaded, mode }: { event: RsvpEvent; theme: ResolvedTheme; loaded: Loaded; mode: RsvpFormMode }) {
  const prompt = readRsvpPrompt(event.page?.layout)
  const { guest, questions } = loaded
  return (
    <RsvpForm
      theme={theme}
      mode={mode}
      deadlinePassed={isDeadlinePassed(event)}
      question={prompt.question}
      options={visibleRsvpOptions(prompt, event.allowMaybe)}
      questions={questions.map((q) => ({
        id: q.id, label: q.label, type: q.type, required: q.required,
        options: Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string") : null,
      }))}
      guest={{
        id: guest.id,
        firstName: guest.firstName,
        rsvpStatus: guest.rsvpStatus,
        rsvpAnswer: guest.rsvpAnswer,
        plusOneAllowed: guest.plusOneAllowed,
        maxPlusOnes: guest.maxPlusOnes,
        numberAttending: guest.numberAttending,
        mealPreference: guest.mealPreference,
        dietaryRestrictions: guest.dietaryRestrictions,
        rsvpMessage: guest.rsvpMessage,
        plusOnes: guest.plusOnes.map((p) => ({ name: p.name })),
        answers: JSON.parse(JSON.stringify(guest.answers)),
      }}
      config={readRsvpForm(event.page?.layout)}
      event={rsvpSummary(event)}
      checkInCode={checkInCode(guest.id, event.id)}
    />
  )
}
