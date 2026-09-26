"use client"

import { APP_TIMEZONE } from "@/lib/timezone"
import { useState } from "react"
import { toast } from "sonner"
import { updateEvent } from "@/actions/events"
import { EVENT_TYPE_OPTIONS } from "@/lib/event-types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MusicSettingsForm } from "@/components/events/music-settings-form"
import type { Event, EventType } from "@prisma/client"

import { safe } from "@/lib/safe-action"
type EventLike = Omit<Event, "date" | "endDate" | "rsvpDeadline" | "createdAt" | "updatedAt" | "archivedAt"> & {
  date: string | null; endDate: string | null; rsvpDeadline: string | null
}

function toInputDate(v: string | null) {
  return v ? new Date(v).toISOString().slice(0, 10) : ""
}

export function EventSettingsForm({ event }: { event: EventLike }) {
  const [form, setForm] = useState({
    name: event.name,
    type: event.type,
    customTypeLabel: event.customTypeLabel ?? "",
    hostName: event.hostName ?? "",
    date: toInputDate(event.date),
    timeLabel: event.timeLabel ?? "",
    timezone: event.timezone,
    venueName: event.venueName ?? "",
    address: event.address ?? "",
    mapUrl: event.mapUrl ?? "",
    description: event.description ?? "",
    rsvpDeadline: toInputDate(event.rsvpDeadline),
    allowLateRsvp: event.allowLateRsvp,
    allowMaybe: event.allowMaybe,
    personalizedRsvpOnly: event.personalizedRsvpOnly,
    isPublic: event.isPublic,
    guestListVisible: event.guestListVisible,
    rsvpVisible: event.rsvpVisible,
  })
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const result = await safe(updateEvent({ eventId: event.id, ...form }))
    setLoading(false)
    if (!result.ok) {
        toast.error(result.error)
        return
      }
    toast.success("Saved.")
  }

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="rsvp">RSVP</TabsTrigger>
        <TabsTrigger value="privacy">Privacy</TabsTrigger>
        <TabsTrigger value="music">Music</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Field label="Event name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Event type">
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EventType })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.emoji} {o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {form.type === "CUSTOM" && <Field label="Custom type label"><Input value={form.customTypeLabel} onChange={(e) => setForm({ ...form, customTypeLabel: e.target.value })} /></Field>}
        <Field label="Host / celebrant name"><Input value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Time"><Input value={form.timeLabel} onChange={(e) => setForm({ ...form, timeLabel: e.target.value })} /></Field>
        </div>
        <Field label="Timezone"><Input value={APP_TIMEZONE} readOnly disabled aria-describedby="tz-note" /><p id="tz-note" className="text-xs text-muted-foreground mt-1">All Events Partner times are Singapore time (UTC+8).</p></Field>
        <Field label="Venue name"><Input value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} /></Field>
        <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <Field label="Google Maps URL"><Input value={form.mapUrl} onChange={(e) => setForm({ ...form, mapUrl: e.target.value })} /></Field>
        <Field label="Description"><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
      </TabsContent>

      <TabsContent value="rsvp" className="space-y-4">
        <Field label="RSVP deadline"><Input type="date" value={form.rsvpDeadline} onChange={(e) => setForm({ ...form, rsvpDeadline: e.target.value })} /></Field>
        <ToggleField label="Allow late RSVPs after the deadline" checked={form.allowLateRsvp} onChange={(v) => setForm({ ...form, allowLateRsvp: v })} />
        <ToggleField label={'Allow "Maybe" responses'} checked={form.allowMaybe} onChange={(v) => setForm({ ...form, allowMaybe: v })} />
        <ToggleField label="Protect name search: guests confirm their email or phone before RSVPing (personal links always work; more options on RSVP Setup)" checked={form.personalizedRsvpOnly} onChange={(v) => setForm({ ...form, personalizedRsvpOnly: v })} />
        <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
      </TabsContent>

      <TabsContent value="privacy" className="space-y-4">
        <ToggleField label="Public event page (visible to anyone with the link)" checked={form.isPublic} onChange={(v) => setForm({ ...form, isPublic: v })} />
        <ToggleField label="Show guest list publicly" checked={form.guestListVisible} onChange={(v) => setForm({ ...form, guestListVisible: v })} />
        <ToggleField label="Show RSVP counts publicly" checked={form.rsvpVisible} onChange={(v) => setForm({ ...form, rsvpVisible: v })} />
        <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
      </TabsContent>

      <TabsContent value="music">
        <MusicSettingsForm event={event} />
      </TabsContent>
    </Tabs>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
