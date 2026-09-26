"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Copy, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateRsvpButton, updateRsvpDeadline, updateRsvpForm } from "@/actions/content"
import { DEFAULT_RSVP_BUTTON, DEFAULT_RSVP_FORM, type RsvpButtonConfig, type RsvpFormConfig } from "@/lib/rsvp-settings"
import { themeStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { RsvpButton } from "@/components/public/rsvp-button"
import { copyText } from "@/lib/copy-text"
import { safe } from "@/lib/safe-action"

type Props = {
  eventId: string
  rsvpUrl: string
  theme: ResolvedTheme
  button: RsvpButtonConfig
  form: RsvpFormConfig
  deadline: string | null
  allowLateRsvp: boolean
  hasRsvpSection: boolean
}

/**
 * The owner's RSVP setup: the RSVP NOW button on the invitation, the RSVP page (how guests find their invitation,
 * which fields they fill in, the intro message) and the deadline. Every save goes to the database and is live on
 * the invitation straight away.
 */
export function RsvpSettingsPanel(props: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ButtonCard {...props} />
      <div className="space-y-6">
        <LinkCard rsvpUrl={props.rsvpUrl} eventId={props.eventId} hasRsvpSection={props.hasRsvpSection} />
        <DeadlineCard eventId={props.eventId} deadline={props.deadline} allowLateRsvp={props.allowLateRsvp} />
      </div>
      <FormCard {...props} />
    </div>
  )
}

function Row({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Choice<T extends string>({ id, value, onChange, options }: { id?: string; value: T; onChange: (v: T) => void; options: Array<[T, string]> }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
    </Select>
  )
}

function ColorField({ id, value, fallbackLabel, onChange }: { id: string; value: string | null; fallbackLabel: string; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input id={id} type="color" value={value ?? "#8a6d3b"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded border bg-background p-1" />
      <span className="flex-1 truncate text-sm text-muted-foreground">{value ?? fallbackLabel}</span>
      {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>Reset</Button>}
    </div>
  )
}

function ButtonCard({ eventId, theme, button, rsvpUrl }: Props) {
  const [cfg, setCfg] = useState<RsvpButtonConfig>(button)
  const [saved, setSaved] = useState(JSON.stringify(button))
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(cfg) !== saved
  const set = <K extends keyof RsvpButtonConfig>(key: K, value: RsvpButtonConfig[K]) => setCfg((c) => ({ ...c, [key]: value }))

  function save() {
    startTransition(async () => {
      const res = await safe(updateRsvpButton(eventId, cfg))
      if (!res.ok) return void toast.error(res.error)
      setCfg(res.data)
      setSaved(JSON.stringify(res.data))
      toast.success("RSVP button saved. It's live on your invitation.")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">RSVP button on your invitation</CardTitle>
        <CardDescription>Guests tap it to open your RSVP page. It links to the real RSVP page for this event.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <span className="text-sm font-medium">Show the RSVP button</span>
          <Switch checked={cfg.show} onCheckedChange={(v) => set("show", v)} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Button text" htmlFor="rsvp-btn-text">
            <Input id="rsvp-btn-text" value={cfg.text} maxLength={40} onChange={(e) => set("text", e.target.value)} placeholder={DEFAULT_RSVP_BUTTON.text} />
          </Row>
          <Row label="Where it appears" htmlFor="rsvp-btn-place">
            <Choice id="rsvp-btn-place" value={cfg.placement} onChange={(v) => set("placement", v)} options={[["section", "In the RSVP section"], ["hero", "Under the title (top)"], ["both", "Top and RSVP section"], ["floating", "Floating + RSVP section"]]} />
          </Row>
          <Row label="Style" htmlFor="rsvp-btn-style">
            <Choice id="rsvp-btn-style" value={cfg.style} onChange={(v) => set("style", v)} options={[["theme", "Match my theme"], ["solid", "Solid"], ["outline", "Outline"], ["soft", "Soft"]]} />
          </Row>
          <Row label="Size" htmlFor="rsvp-btn-size">
            <Choice id="rsvp-btn-size" value={cfg.size} onChange={(v) => set("size", v)} options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"]]} />
          </Row>
          <Row label="Alignment" htmlFor="rsvp-btn-align">
            <Choice id="rsvp-btn-align" value={cfg.align} onChange={(v) => set("align", v)} options={[["left", "Left"], ["center", "Center"], ["right", "Right"]]} />
          </Row>
          <Row label="Corners" htmlFor="rsvp-btn-radius">
            <Choice id="rsvp-btn-radius" value={cfg.radius} onChange={(v) => set("radius", v)} options={[["theme", "Match my theme"], ["square", "Square"], ["rounded", "Rounded"], ["pill", "Pill"]]} />
          </Row>
          <Row label="Button color" htmlFor="rsvp-btn-color">
            <ColorField id="rsvp-btn-color" value={cfg.color} fallbackLabel="Theme accent" onChange={(v) => set("color", v)} />
          </Row>
          <Row label="Text color" htmlFor="rsvp-btn-text-color">
            <ColorField id="rsvp-btn-text-color" value={cfg.textColor} fallbackLabel="Automatic" onChange={(v) => set("textColor", v)} />
          </Row>
          <Row label={`Border width: ${cfg.borderWidth}px`} htmlFor="rsvp-btn-border">
            <input id="rsvp-btn-border" type="range" min={0} max={4} step={0.5} value={cfg.borderWidth} onChange={(e) => set("borderWidth", Number(e.target.value))} className="w-full accent-[var(--primary)]" />
          </Row>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <div className="rounded-xl p-5" style={themeStyle(theme)}>
            {cfg.show ? <RsvpButton href={rsvpUrl} config={{ ...cfg, text: cfg.text.trim() || DEFAULT_RSVP_BUTTON.text }} theme={theme} /> : <p className="text-center text-sm opacity-70">The RSVP button is hidden.</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending || !dirty}>{pending ? "Saving..." : dirty ? "Save button" : "Saved"}</Button>
          <Button variant="ghost" onClick={() => setCfg(DEFAULT_RSVP_BUTTON)} disabled={pending}><RotateCcw className="size-3.5" /> Use default</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function LinkCard({ rsvpUrl, eventId, hasRsvpSection }: { rsvpUrl: string; eventId: string; hasRsvpSection: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your RSVP page</CardTitle>
        <CardDescription>Guests search their name here, or open their personal link from the Guests page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs break-all">{rsvpUrl}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copyText(rsvpUrl, "RSVP page link copied.")}><Copy className="size-3.5" /> Copy link</Button>
          <Button size="sm" variant="outline" asChild><a href={rsvpUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Open RSVP page</a></Button>
          <Button size="sm" variant="ghost" asChild><Link href={`/dashboard/events/${eventId}/website`}>{hasRsvpSection ? "Edit RSVP section text & style" : "Add an RSVP section"}</Link></Button>
        </div>
        {!hasRsvpSection && <p className="text-xs text-muted-foreground">Your invitation has no visible RSVP section, so a compact RSVP block with the button is added automatically.</p>}
      </CardContent>
    </Card>
  )
}

function DeadlineCard({ eventId, deadline, allowLateRsvp }: { eventId: string; deadline: string | null; allowLateRsvp: boolean }) {
  const [date, setDate] = useState(deadline ?? "")
  const [late, setLate] = useState(allowLateRsvp)
  const [saved, setSaved] = useState(`${deadline ?? ""}|${allowLateRsvp}`)
  const [pending, startTransition] = useTransition()
  const dirty = `${date}|${late}` !== saved

  function save() {
    startTransition(async () => {
      const res = await safe(updateRsvpDeadline(eventId, date || null, late))
      if (!res.ok) return void toast.error(res.error)
      setSaved(`${date}|${late}`)
      toast.success(date ? "RSVP deadline saved." : "RSVP deadline removed.")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">RSVP deadline</CardTitle>
        <CardDescription>Shown on the invitation and RSVP page. Guests can respond until the end of that day.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <Row label="Respond by" htmlFor="rsvp-deadline">
            <Input id="rsvp-deadline" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </Row>
          {date && <Button type="button" variant="ghost" size="sm" onClick={() => setDate("")}>No deadline</Button>}
        </div>
        <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <span className="text-sm">Still accept RSVPs after the deadline</span>
          <Switch checked={late} onCheckedChange={setLate} />
        </label>
        <Button onClick={save} disabled={pending || !dirty}>{pending ? "Saving..." : dirty ? "Save deadline" : "Saved"}</Button>
      </CardContent>
    </Card>
  )
}

function FormCard({ eventId, form }: Props) {
  const [cfg, setCfg] = useState<RsvpFormConfig>(form)
  const [saved, setSaved] = useState(JSON.stringify(form))
  const [newMeal, setNewMeal] = useState("")
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(cfg) !== saved
  const set = <K extends keyof RsvpFormConfig>(key: K, value: RsvpFormConfig[K]) => setCfg((c) => ({ ...c, [key]: value }))

  function addMeal() {
    const m = newMeal.trim()
    if (!m || cfg.mealOptions.includes(m) || cfg.mealOptions.length >= 12) return
    set("mealOptions", [...cfg.mealOptions, m])
    setNewMeal("")
  }

  function save() {
    startTransition(async () => {
      const res = await safe(updateRsvpForm(eventId, cfg))
      if (!res.ok) return void toast.error(res.error)
      setCfg(res.data)
      setSaved(JSON.stringify(res.data))
      toast.success("RSVP page saved.")
    })
  }

  const toggles: Array<[keyof RsvpFormConfig, string]> = [
    ["askCount", "Ask how many people are attending (for invitations with plus-ones)"],
    ["askMeal", "Ask for a meal preference"],
    ["askDietary", "Ask about dietary restrictions"],
    ["askMessage", "Let guests leave a message"],
  ]

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">RSVP page</CardTitle>
        <CardDescription>How guests find their invitation and what the RSVP form asks. Your own questions are below.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Row label="How guests find their invitation" htmlFor="rsvp-lookup"
            hint={cfg.lookup === "off" ? "Name search is turned off. Guests must use the personal link you send them." : cfg.lookup === "name-verified" ? "After choosing their name, guests confirm their email or the last 4 digits of their phone." : "Guests confirm their email or phone only when two invitations look alike."}>
            <Choice id="rsvp-lookup" value={cfg.lookup} onChange={(v) => set("lookup", v)} options={[["name", "Search by name"], ["name-verified", "Search by name + confirm email/phone"], ["off", "Personal links only"]]} />
          </Row>
          <Row label="Message at the top of the RSVP page (optional)" htmlFor="rsvp-intro">
            <Textarea id="rsvp-intro" rows={3} maxLength={500} value={cfg.intro} onChange={(e) => set("intro", e.target.value)} placeholder="We can't wait to celebrate with you!" />
          </Row>
        </div>
        <div className="space-y-3">
          {toggles.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm">{label}</span>
              <Switch checked={cfg[key] as boolean} onCheckedChange={(v) => set(key, v as never)} />
            </label>
          ))}
          {cfg.askMeal && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label>Meal choices</Label>
              <p className="text-xs text-muted-foreground">Leave empty to let guests type their preference.</p>
              {cfg.mealOptions.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="flex-1 truncate rounded-md border px-3 py-1.5 text-sm">{m}</span>
                  <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => set("mealOptions", cfg.mealOptions.filter((x) => x !== m))} aria-label={`Remove ${m}`}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newMeal} maxLength={60} onChange={(e) => setNewMeal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMeal() } }} placeholder="e.g. Chicken" />
                <Button type="button" variant="outline" onClick={addMeal} disabled={!newMeal.trim()}><Plus className="size-3.5" /> Add</Button>
              </div>
            </div>
          )}
          {cfg.askMessage && (
            <Row label="Message field label" htmlFor="rsvp-msg-label">
              <Input id="rsvp-msg-label" value={cfg.messageLabel} maxLength={80} onChange={(e) => set("messageLabel", e.target.value)} placeholder={DEFAULT_RSVP_FORM.messageLabel} />
            </Row>
          )}
        </div>
        <div className="lg:col-span-2 flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending || !dirty}>{pending ? "Saving..." : dirty ? "Save RSVP page" : "Saved"}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
