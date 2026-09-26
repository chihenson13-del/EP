"use client"

import { useState } from "react"
import { toast } from "sonner"
import { submitRsvp } from "@/actions/rsvp"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { buttonStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { RADIUS_PX } from "@/lib/themes"
import type { RsvpOption } from "@/lib/rsvp-prompt"
import { CheckCircle2 } from "lucide-react"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type Question = {
  id: string
  label: string
  type: "YES_NO" | "MULTIPLE_CHOICE" | "CHECKBOX" | "DROPDOWN" | "SHORT_TEXT" | "LONG_TEXT" | "NUMBER"
  required: boolean
  options: string[] | null
}

type GuestData = {
  id: string
  rsvpToken: string
  firstName: string
  lastName: string | null
  rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"
  plusOneAllowed: boolean
  maxPlusOnes: number
  mealPreference: string | null
  dietaryRestrictions: string | null
  plusOnes: { name: string | null }[]
  answers: { questionId: string; value: unknown }[]
}

export function RsvpForm({
  theme, deadlinePassed, question, options, questions, guest,
}: { theme: ResolvedTheme; deadlinePassed: boolean; question: string; options: RsvpOption[]; questions: Question[]; guest: GuestData }) {
  // The guest picks one of the organizer's answer choices; each maps to a stored RSVP status.
  const [choiceId, setChoiceId] = useState<string>(
    (guest.rsvpStatus !== "PENDING" && options.find((o) => o.status === guest.rsvpStatus)?.id) || options[0]?.id || ""
  )
  const status = options.find((o) => o.id === choiceId)?.status ?? "ATTENDING"
  const radius = RADIUS_PX[theme.radius]
  const [plusOneNames, setPlusOneNames] = useState<string[]>(guest.plusOnes.map((p) => p.name ?? "") || [])
  const [meal, setMeal] = useState(guest.mealPreference ?? "")
  const [dietary, setDietary] = useState(guest.dietaryRestrictions ?? "")
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(guest.answers.map((a) => [a.questionId, typeof a.value === "string" ? a.value : JSON.stringify(a.value)]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(guest.rsvpStatus !== "PENDING")

  const once = useSingleFlight()
  function updatePlusOne(i: number, value: string) {
    setPlusOneNames((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  function handleSubmit() {
    return once(async () => {
    setSubmitting(true)
    const result = await safe(submitRsvp({
      guestId: guest.id,
      rsvpToken: guest.rsvpToken,
      rsvpStatus: status,
      plusOneNames: status === "ATTENDING" ? plusOneNames : [],
      mealPreference: meal,
      dietaryRestrictions: dietary,
      answers,
    }))
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setDone(true)
      })
  }

  const cardStyle = { background: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border, borderRadius: radius }

  if (deadlinePassed) {
    return (
      <Card style={cardStyle}><CardContent className="p-8 text-center">
        <p className="font-medium">The RSVP deadline for this event has passed.</p>
      </CardContent></Card>
    )
  }

  if (done) {
    return (
      <Card style={cardStyle}><CardContent className="p-8 text-center space-y-3" style={{ fontFamily: "var(--font-rsvp)" }}>
        <CheckCircle2 className="mx-auto size-10" style={{ color: theme.accent }} />
        <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: theme.colors.primary }}>Thanks, {guest.firstName}!</h2>
        <p className="text-sm font-medium">{options.find((o) => o.id === choiceId)?.label}</p>
        <p className="opacity-70 text-sm">
          {status === "ATTENDING" && "We've got you down as attending. See you there!"}
          {status === "DECLINED" && "We've recorded that you can't make it. Thanks for letting us know."}
          {status === "MAYBE" && "We've recorded your response as maybe. You can update it anytime with this link."}
        </p>
        <button type="button" className="px-5 py-2 text-sm font-medium cursor-pointer" style={{ ...buttonStyle(theme), background: "transparent", color: theme.colors.accent, borderColor: theme.colors.accent }} onClick={() => setDone(false)}>Update my response</button>
      </CardContent></Card>
    )
  }

  return (
    <Card style={cardStyle}>
      <CardContent className="p-6 space-y-6">
        <div style={{ fontFamily: "var(--font-rsvp)" }}>
          <p className="text-sm opacity-75 mb-1">Hi {guest.firstName},</p>
          <p className="text-lg font-semibold mb-3" style={{ color: theme.colors.primary }}>{question}</p>
          <RadioGroup value={choiceId} onValueChange={setChoiceId} className="grid gap-2" aria-label={question}>
            {options.map((o) => <RadioOption key={o.id} value={o.id} label={o.label} theme={theme} selected={choiceId === o.id} />)}
          </RadioGroup>
        </div>

        {status === "ATTENDING" && (
          <>
            {guest.plusOneAllowed && guest.maxPlusOnes > 0 && (
              <div className="space-y-2">
                <Label>Plus-ones (up to {guest.maxPlusOnes})</Label>
                {Array.from({ length: guest.maxPlusOnes }).map((_, i) => (
                  <Input key={i} placeholder={`Guest ${i + 1} name (optional)`} value={plusOneNames[i] ?? ""} onChange={(e) => updatePlusOne(i, e.target.value)} />
                ))}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Meal preference</Label>
                <Input value={meal} onChange={(e) => setMeal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dietary restrictions</Label>
                <Input value={dietary} onChange={(e) => setDietary(e.target.value)} />
              </div>
            </div>
            {questions.map((q) => (
              <QuestionField key={q.id} question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))} />
            ))}
          </>
        )}

        <button type="button" onClick={handleSubmit} disabled={submitting} className="w-full px-5 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-60" style={buttonStyle(theme)}>
          {submitting ? "Submitting..." : "Submit RSVP"}
        </button>
      </CardContent>
    </Card>
  )
}

function RadioOption({ value, label, theme, selected }: { value: string; label: string; theme: ResolvedTheme; selected: boolean }) {
  return (
    <label
      className="flex items-center gap-2 border p-3 cursor-pointer transition-colors"
      style={{
        borderRadius: Math.max(8, RADIUS_PX[theme.radius]),
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        borderWidth: selected ? 2 : 1,
        background: selected ? `color-mix(in oklab, ${theme.colors.accent}, transparent 90%)` : "transparent",
      }}
    >
      <RadioGroupItem value={value} style={{ accentColor: theme.accent, borderColor: theme.colors.accent }} />
      {label}
    </label>
  )
}

function QuestionField({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  const label = `${question.label}${question.required ? " *" : ""}`
  if (question.type === "YES_NO") {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm"><RadioGroupItem value="Yes" /> Yes</label>
          <label className="flex items-center gap-1.5 text-sm"><RadioGroupItem value="No" /> No</label>
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
            <label key={opt} className="flex items-center gap-1.5 text-sm"><RadioGroupItem value={opt} /> {opt}</label>
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
          <label key={opt} className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={(c) => {
                const next = c ? [...selected, opt] : selected.filter((o) => o !== opt)
                onChange(next.join("||"))
              }}
            />
            {opt}
          </label>
        ))}
      </div>
    )
  }
  if (question.type === "LONG_TEXT") {
    return <div className="space-y-1.5"><Label>{label}</Label><Textarea value={value} onChange={(e) => onChange(e.target.value)} /></div>
  }
  if (question.type === "NUMBER") {
    return <div className="space-y-1.5"><Label>{label}</Label><Input type="number" value={value} onChange={(e) => onChange(e.target.value)} /></div>
  }
  return <div className="space-y-1.5"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>
}
