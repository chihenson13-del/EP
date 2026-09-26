"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, CalendarDays, MapPin } from "lucide-react"
import { submitRsvp, submitRsvpForSession } from "@/actions/rsvp"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { buttonStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { RADIUS_PX } from "@/lib/themes"
import type { RsvpOption } from "@/lib/rsvp-prompt"
import type { RsvpFormConfig } from "@/lib/rsvp-settings"
import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
import { CheckInPass } from "@/components/public/checkin-pass"

type Question = {
  id: string
  label: string
  type: "YES_NO" | "MULTIPLE_CHOICE" | "CHECKBOX" | "DROPDOWN" | "SHORT_TEXT" | "LONG_TEXT" | "NUMBER"
  required: boolean
  options: string[] | null
}

type GuestData = {
  id: string
  firstName: string
  rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"
  rsvpAnswer: string | null
  plusOneAllowed: boolean
  maxPlusOnes: number
  numberAttending: number | null
  mealPreference: string | null
  dietaryRestrictions: string | null
  rsvpMessage: string | null
  plusOnes: { name: string | null }[]
  answers: { questionId: string; value: unknown }[]
}

export type RsvpFormMode = { kind: "token"; rsvpToken: string } | { kind: "session"; slug: string }

export type RsvpEventSummary = { name: string; dateLabel: string | null; venueName: string | null; address: string | null }

/**
 * The guest's RSVP form. It never shows a success message unless the server confirmed the database save.
 * Which fields appear is set by the host on the RSVP settings page.
 */
export function RsvpForm({
  theme, mode, deadlinePassed, question, options, questions, guest, config, event, checkInCode,
}: {
  /** Personal check-in pass shown to attending guests (a signed code, not the RSVP link). */
  checkInCode?: string
  theme: ResolvedTheme
  mode: RsvpFormMode
  deadlinePassed: boolean
  question: string
  options: RsvpOption[]
  questions: Question[]
  guest: GuestData
  config: RsvpFormConfig
  event: RsvpEventSummary
}) {
  const answered = guest.rsvpStatus !== "PENDING"
  const [choiceId, setChoiceId] = useState<string>(
    // Nothing is pre-selected for a guest who hasn't answered, so nobody submits "Yes" by accident.
    (answered && (options.find((o) => o.label === guest.rsvpAnswer)?.id || options.find((o) => o.status === guest.rsvpStatus)?.id)) || ""
  )
  const choice = options.find((o) => o.id === choiceId)
  const status = choice?.status ?? null
  const maxAttending = 1 + (guest.plusOneAllowed ? guest.maxPlusOnes : 0)
  const [count, setCount] = useState<number>(Math.min(Math.max(guest.numberAttending ?? 1, 1), maxAttending))
  const [plusOneNames, setPlusOneNames] = useState<string[]>(guest.plusOnes.map((p) => p.name ?? ""))
  const [meal, setMeal] = useState(guest.mealPreference ?? "")
  const [dietary, setDietary] = useState(guest.dietaryRestrictions ?? "")
  const [message, setMessage] = useState(guest.rsvpMessage ?? "")
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(guest.answers.map((a) => [a.questionId, typeof a.value === "string" ? a.value : Array.isArray(a.value) ? (a.value as string[]).join("||") : JSON.stringify(a.value)]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(answered)
  // True only after THIS visit's submission was confirmed by the server; a returning guest sees "already saved".
  const [justSaved, setJustSaved] = useState(false)
  const once = useSingleFlight()
  const radius = RADIUS_PX[theme.radius]
  const cardStyle: React.CSSProperties = { background: theme.colors.surface, color: theme.colors.text, border: `1px solid ${theme.colors.border}`, borderRadius: radius }

  function updatePlusOne(i: number, value: string) {
    setPlusOneNames((prev) => { const next = [...prev]; next[i] = value; return next })
  }

  function handleSubmit() {
    return once(async () => {
      if (!choice) return void toast.error("Please choose your answer first.")
      setSubmitting(true)
      const payload = {
        rsvpStatus: choice.status,
        optionId: choiceId,
        numberAttending: status === "ATTENDING" ? (config.askCount && maxAttending > 1 ? count : 1 + plusOneNames.filter((n) => n.trim()).length) : 0,
        plusOneNames: status === "ATTENDING" ? plusOneNames : [],
        mealPreference: meal,
        dietaryRestrictions: dietary,
        message,
        answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, questions.find((q) => q.id === k)?.type === "CHECKBOX" ? v.split("||").filter(Boolean) : v])),
      }
      const result = await safe(mode.kind === "token"
        ? submitRsvp({ ...payload, guestId: guest.id, rsvpToken: mode.rsvpToken })
        : submitRsvpForSession(mode.slug, payload))
      setSubmitting(false)
      if (!result.ok) return void toast.error(result.error)
      setJustSaved(true)
      setDone(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  if (deadlinePassed) {
    const saved = answered ? (options.find((o) => o.label === guest.rsvpAnswer) ?? options.find((o) => o.status === guest.rsvpStatus)) : undefined
    return (
      <div className="p-6 sm:p-8 text-center space-y-2" style={cardStyle} role="status">
        <p className="font-medium">The RSVP deadline for this event has passed.</p>
        {saved && <p className="text-sm">Your saved response: <strong>{saved.label}</strong>{guest.rsvpStatus === "ATTENDING" && (guest.numberAttending ?? 1) > 1 ? ` · ${guest.numberAttending} guests` : ""}</p>}
        <p className="text-sm opacity-75">Please contact the host if your plans have changed.</p>
        {checkInCode && guest.rsvpStatus === "ATTENDING" && <div className="pt-3"><CheckInPass code={checkInCode} guestName={guest.firstName} eventName={event.name} theme={theme} /></div>}
      </div>
    )
  }

  if (done) {
    return (
      <div className="p-6 sm:p-8 text-center space-y-4" style={{ ...cardStyle, fontFamily: "var(--font-rsvp)" }} role="status">
        <CheckCircle2 className="mx-auto size-12" style={{ color: theme.colors.accent }} aria-hidden />
        {justSaved ? (
          <>
            <h2 className="text-[clamp(1.5rem,6vw,2rem)] font-semibold break-words" style={{ fontFamily: "var(--font-heading)", color: theme.colors.primary }}>Thank You, {guest.firstName}!</h2>
            <p className="opacity-85">Your RSVP has been received.</p>
          </>
        ) : (
          <>
            <h2 className="text-[clamp(1.4rem,5.5vw,1.8rem)] font-semibold break-words" style={{ fontFamily: "var(--font-heading)", color: theme.colors.primary }}>Welcome back, {guest.firstName}!</h2>
            <p className="opacity-85">Your RSVP is saved. You can change it any time before the deadline.</p>
          </>
        )}
        {choice && <p className="inline-block rounded-full px-4 py-1 text-sm font-medium" style={{ background: `color-mix(in oklab, ${theme.colors.accent}, transparent 85%)` }}>{choice.label}{status === "ATTENDING" && count > 1 ? ` · ${count} guests` : ""}</p>}
        {checkInCode && status === "ATTENDING" && <CheckInPass code={checkInCode} guestName={guest.firstName} eventName={event.name} theme={theme} />}
        <EventDetails event={event} theme={theme} />
        <button type="button" className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium cursor-pointer" style={{ ...buttonStyle(theme), background: "transparent", color: theme.colors.accent, borderColor: theme.colors.accent }} onClick={() => setDone(false)}>
          Update my response
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 space-y-6" style={cardStyle}>
      <fieldset style={{ fontFamily: "var(--font-rsvp)" }}>
        <legend className="w-full">
          <span className="block text-sm opacity-75 mb-1">Hi, {guest.firstName}!</span>
          <span className="block text-[clamp(1.15rem,5vw,1.4rem)] font-semibold mb-3 break-words" style={{ color: theme.colors.primary }}>{question}</span>
        </legend>
        <RadioGroup value={choiceId} onValueChange={setChoiceId} className="grid gap-2" aria-label={question}>
          {options.map((o) => <ChoiceOption key={o.id} value={o.id} label={o.label} theme={theme} selected={choiceId === o.id} />)}
        </RadioGroup>
      </fieldset>

      {status === "ATTENDING" && (
        <>
          {config.askCount && maxAttending > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="rsvp-count">How many people are attending (including you)?</Label>
              <Input id="rsvp-count" type="number" inputMode="numeric" min={1} max={maxAttending} value={count} onChange={(e) => setCount(Math.min(maxAttending, Math.max(1, Number(e.target.value) || 1)))} className="w-28 h-11 text-base" />
              <p className="text-xs opacity-70">Your invitation is for up to {maxAttending}.</p>
            </div>
          )}
          {guest.plusOneAllowed && guest.maxPlusOnes > 0 && (
            <div className="space-y-2">
              <Label>Plus-one name{guest.maxPlusOnes > 1 ? "s" : ""} (optional)</Label>
              {Array.from({ length: config.askCount ? Math.max(0, count - 1) : guest.maxPlusOnes }).map((_, i) => (
                <Input key={i} className="h-11 text-base" placeholder={`Guest ${i + 1} name`} value={plusOneNames[i] ?? ""} onChange={(e) => updatePlusOne(i, e.target.value)} />
              ))}
            </div>
          )}
          {config.askMeal && (
            <div className="space-y-1.5">
              <Label>Meal preference</Label>
              {config.mealOptions.length ? (
                <RadioGroup value={meal} onValueChange={setMeal} className="grid gap-2">
                  {config.mealOptions.map((m) => <ChoiceOption key={m} value={m} label={m} theme={theme} selected={meal === m} />)}
                </RadioGroup>
              ) : (
                <Input className="h-11 text-base" value={meal} onChange={(e) => setMeal(e.target.value)} />
              )}
            </div>
          )}
          {config.askDietary && (
            <div className="space-y-1.5">
              <Label htmlFor="rsvp-dietary">Dietary restrictions</Label>
              <Input id="rsvp-dietary" className="h-11 text-base" value={dietary} onChange={(e) => setDietary(e.target.value)} />
            </div>
          )}
          {questions.map((q) => (
            <QuestionField key={q.id} question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))} />
          ))}
        </>
      )}

      {config.askMessage && (
        <div className="space-y-1.5">
          <Label htmlFor="rsvp-message">{config.messageLabel} <span className="opacity-60 font-normal">(optional)</span></Label>
          <Textarea id="rsvp-message" rows={3} maxLength={1000} className="text-base" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      )}

      <button type="button" onClick={handleSubmit} disabled={submitting || !choice} className="w-full min-h-12 px-5 py-3 text-base font-semibold tracking-wide cursor-pointer disabled:opacity-60" style={buttonStyle(theme)}>
        {submitting ? "Submitting…" : "SUBMIT RSVP"}
      </button>
    </div>
  )
}

export function EventDetails({ event, theme }: { event: RsvpEventSummary; theme: ResolvedTheme }) {
  if (!event.dateLabel && !event.venueName) return null
  return (
    <div className="mx-auto max-w-sm space-y-2 text-sm text-left rounded-lg p-4" style={{ border: `1px solid ${theme.colors.border}` }}>
      <p className="font-semibold break-words" style={{ color: theme.colors.primary }}>{event.name}</p>
      {event.dateLabel && <p className="flex gap-2"><CalendarDays className="size-4 shrink-0 mt-0.5" style={{ color: theme.colors.accent }} aria-hidden /> <span>{event.dateLabel}</span></p>}
      {event.venueName && <p className="flex gap-2"><MapPin className="size-4 shrink-0 mt-0.5" style={{ color: theme.colors.accent }} aria-hidden /> <span className="break-words">{event.venueName}{event.address ? `, ${event.address}` : ""}</span></p>}
    </div>
  )
}

function ChoiceOption({ value, label, theme, selected }: { value: string; label: string; theme: ResolvedTheme; selected: boolean }) {
  return (
    <label
      className="flex min-h-12 items-center gap-3 border px-4 py-3 cursor-pointer transition-colors"
      style={{
        borderRadius: Math.max(10, RADIUS_PX[theme.radius]),
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        borderWidth: selected ? 2 : 1,
        background: selected ? `color-mix(in oklab, ${theme.colors.accent}, transparent 90%)` : "transparent",
      }}
    >
      <RadioGroupItem value={value} style={{ borderColor: theme.colors.accent }} />
      <span className="break-words">{label}</span>
    </label>
  )
}

function QuestionField({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  const label = `${question.label}${question.required ? " *" : ""}`
  if (question.type === "YES_NO") {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <RadioGroup value={value} onValueChange={onChange} className="flex gap-6">
          <label className="flex items-center gap-2 text-sm min-h-10"><RadioGroupItem value="Yes" /> Yes</label>
          <label className="flex items-center gap-2 text-sm min-h-10"><RadioGroupItem value="No" /> No</label>
        </RadioGroup>
      </div>
    )
  }
  if (question.type === "MULTIPLE_CHOICE" || question.type === "DROPDOWN") {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <RadioGroup value={value} onValueChange={onChange} className="grid gap-1.5">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm min-h-10"><RadioGroupItem value={opt} /> <span className="break-words">{opt}</span></label>
          ))}
        </RadioGroup>
      </div>
    )
  }
  if (question.type === "CHECKBOX") {
    const selected = value ? value.split("||") : []
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        {(question.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm min-h-10">
            <Checkbox checked={selected.includes(opt)} onCheckedChange={(c) => onChange((c ? [...selected, opt] : selected.filter((o) => o !== opt)).join("||"))} />
            <span className="break-words">{opt}</span>
          </label>
        ))}
      </div>
    )
  }
  if (question.type === "LONG_TEXT") return <div className="space-y-1.5"><Label>{label}</Label><Textarea className="text-base" value={value} onChange={(e) => onChange(e.target.value)} /></div>
  if (question.type === "NUMBER") return <div className="space-y-1.5"><Label>{label}</Label><Input className="h-11 text-base" type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} /></div>
  return <div className="space-y-1.5"><Label>{label}</Label><Input className="h-11 text-base" value={value} onChange={(e) => onChange(e.target.value)} /></div>
}
