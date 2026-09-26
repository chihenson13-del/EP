"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateRsvpPrompt } from "@/actions/content"
import { DEFAULT_RSVP_PROMPT, RSVP_LIMITS, RSVP_STATUS_LABEL, validateRsvpPrompt, type RsvpAnswerStatus, type RsvpOption, type RsvpPrompt } from "@/lib/rsvp-prompt"
import { buttonStyle, themeStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { RADIUS_PX } from "@/lib/themes"
import { safe } from "@/lib/safe-action"

let counter = 0
const newId = () => `opt-${Date.now().toString(36)}-${(counter++).toString(36)}`

/**
 * Edit the main RSVP question and its answer choices. Each choice counts as Attending, Not attending or Maybe,
 * so existing responses keep working whatever the wording. The preview renders with the event's theme.
 */
export function RsvpPromptEditor({ eventId, initial, allowMaybe, theme }: { eventId: string; initial: RsvpPrompt; allowMaybe: boolean; theme: ResolvedTheme }) {
  const [prompt, setPrompt] = useState<RsvpPrompt>(initial)
  const [saved, setSaved] = useState(JSON.stringify(initial))
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(prompt) !== saved
  const check = validateRsvpPrompt(prompt)

  function updateOption(id: string, patch: Partial<RsvpOption>) {
    setPrompt((p) => ({ ...p, options: p.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
  }
  function move(index: number, delta: -1 | 1) {
    setPrompt((p) => {
      const options = [...p.options]
      const target = index + delta
      if (target < 0 || target >= options.length) return p
      ;[options[index], options[target]] = [options[target], options[index]]
      return { ...p, options }
    })
  }
  function remove(id: string) {
    setPrompt((p) => ({ ...p, options: p.options.filter((o) => o.id !== id) }))
  }
  function add() {
    setPrompt((p) => ({ ...p, options: [...p.options, { id: newId(), label: "", status: "ATTENDING" }] }))
  }
  function save() {
    if (!check.ok) return toast.error(check.error)
    startTransition(async () => {
      const result = await safe(updateRsvpPrompt(eventId, prompt))
      if (!result.ok) return void toast.error(result.error)
      setPrompt(result.data)
      setSaved(JSON.stringify(result.data))
      toast.success("RSVP question saved. It's live on your invitation.")
    })
  }

  const shown = prompt.options.filter((o) => allowMaybe || o.status !== "MAYBE")
  const radius = RADIUS_PX[theme.radius]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Main RSVP question</CardTitle>
        <CardDescription>What guests are asked first, and the answers they can pick. Changing the wording never affects responses you already have.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rsvp-question">Question</Label>
            <Input id="rsvp-question" value={prompt.question} maxLength={RSVP_LIMITS.question} onChange={(e) => setPrompt((p) => ({ ...p, question: e.target.value }))} placeholder={DEFAULT_RSVP_PROMPT.question} />
          </div>

          <div className="space-y-2">
            <Label>Answers</Label>
            <ol className="space-y-2">
              {prompt.options.map((o, i) => (
                <li key={o.id} className="rounded-lg border p-2 space-y-2">
                  <div className="flex items-center gap-1">
                    <Input value={o.label} maxLength={RSVP_LIMITS.label} onChange={(e) => updateOption(o.id, { label: e.target.value })} placeholder="Answer text" aria-label={`Answer ${i + 1}`} className="flex-1" />
                    <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move answer up"><ArrowUp className="size-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => move(i, 1)} disabled={i === prompt.options.length - 1} aria-label="Move answer down"><ArrowDown className="size-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => remove(o.id)} disabled={prompt.options.length <= RSVP_LIMITS.minOptions} aria-label="Delete answer"><Trash2 className="size-4" /></Button>
                  </div>
                  <Select value={o.status} onValueChange={(v) => updateOption(o.id, { status: v as RsvpAnswerStatus })}>
                    <SelectTrigger className="h-8 w-full text-xs" aria-label="What this answer counts as"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RSVP_STATUS_LABEL) as RsvpAnswerStatus[]).map((s) => <SelectItem key={s} value={s}>{RSVP_STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {o.status === "MAYBE" && !allowMaybe && <p className="text-[11px] text-amber-700">Hidden from guests: &quot;Allow maybe&quot; is off in event settings.</p>}
                </li>
              ))}
            </ol>
            <Button type="button" size="sm" variant="outline" onClick={add} disabled={prompt.options.length >= RSVP_LIMITS.maxOptions}><Plus className="size-3.5" /> Add answer</Button>
          </div>

          {!check.ok && <p className="text-sm text-destructive" role="alert">{check.error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={pending || !dirty || !check.ok}>{pending ? "Saving..." : dirty ? "Save" : "Saved"}</Button>
            <Button variant="ghost" onClick={() => setPrompt(DEFAULT_RSVP_PROMPT)} disabled={pending}><RotateCcw className="size-3.5" /> Use default</Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Preview — what guests see</p>
          <div className="rounded-xl p-5" style={themeStyle(theme)}>
            <div className="p-5 space-y-3" style={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: radius, fontFamily: "var(--font-rsvp)" }}>
              <p className="text-sm opacity-75">Hi Jane,</p>
              <p className="text-lg font-semibold" style={{ color: theme.colors.primary }}>{prompt.question || DEFAULT_RSVP_PROMPT.question}</p>
              <div className="grid gap-2">
                {shown.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2 border p-3 text-sm" style={{ borderRadius: Math.max(8, radius), borderColor: i === 0 ? theme.colors.accent : theme.colors.border, borderWidth: i === 0 ? 2 : 1 }}>
                    <span className="size-4 rounded-full border-2 grid place-items-center" style={{ borderColor: theme.colors.accent }}>{i === 0 && <span className="size-2 rounded-full" style={{ background: theme.colors.accent }} />}</span>
                    {o.label || <span className="opacity-50">Answer text</span>}
                  </div>
                ))}
              </div>
              <div className="w-full px-5 py-2.5 text-center text-sm font-semibold" style={buttonStyle(theme)}>Submit RSVP</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
