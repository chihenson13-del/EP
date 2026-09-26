"use client"

import { singaporeLocalToInstant, formatDateTime } from "@/lib/timezone"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Send, Info } from "lucide-react"
import { sendMessage } from "@/actions/messaging"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SmsComingSoonCard, ComingSoonBadge } from "@/components/addons/sms-coming-soon"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type Guest = { id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null; rsvpStatus: string }
type Log = { id: string; channel: "EMAIL" | "SMS"; type: string; status: string; isMock: boolean; createdAt: string; guest: { firstName: string; lastName: string | null } | null }

const VARIABLES = ["{name}", "{event}", "{date}", "{time}", "{venue}", "{rsvp_link}"]

const TEMPLATES: Record<string, string> = {
  INVITATION: "Hi {name}! You're invited to {event} on {date} at {time}, {venue}. Please RSVP: {rsvp_link}",
  REMINDER: "Hi {name}, just a reminder about {event} on {date}. We'd love to know if you can make it: {rsvp_link}",
  CUSTOM: "",
}

/**
 * Email is live. SMS is paused (lib/addons.ts): its tab shows the Coming Soon card and there is no SMS send path in
 * this component at all. The server refuses SMS independently, so this is not the only safeguard.
 */
export function MessagingConsole({ eventId, guests, logs, providersConfigured }: { eventId: string; guests: Guest[]; logs: Log[]; providersConfigured: boolean }) {
  const [tab, setTab] = useState<"EMAIL" | "SMS">("EMAIL")
  const channel = "EMAIL" as const
  const [type, setType] = useState<"INVITATION" | "REMINDER" | "CUSTOM">("INVITATION")
  const [subject, setSubject] = useState("You're invited!")
  const [body, setBody] = useState(TEMPLATES.INVITATION)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scheduledFor, setScheduledFor] = useState("")
  const [pending, startTransition] = useTransition()

  const eligibleGuests = useMemo(() => guests.filter((g) => g.email), [guests])

  const once = useSingleFlight()
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(eligibleGuests.map((g) => g.id)) : new Set())
  }
  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleSend() {
    if (!selected.size) {
        toast.error("Select at least one guest.")
        return
      }
    if (!body.trim()) {
        toast.error("Write a message.")
        return
      }
    startTransition(async () => {
      await once(async () => {
      const result = await safe(sendMessage({
        eventId, channel, type, guestIds: Array.from(selected),
        subject,
        // datetime-local is the user's local wall-clock time; send an absolute instant so the server doesn't read it as UTC.
        body, scheduledFor: scheduledFor ? singaporeLocalToInstant(scheduledFor).toISOString() : undefined,
      }))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.data.scheduled > 0) {
        toast.success(`${result.data.scheduled} message(s) scheduled. Scheduled messages are delivered by a daily background job, so they go out on the scheduled day.${result.data.skipped ? ` ${result.data.skipped} skipped (missing contact info).` : ""}`)
      } else if (result.data.mock) {
        toast.success(`${result.data.sent} message(s) processed in MOCK MODE — no real message was delivered.`)
      } else {
        toast.success(`${result.data.sent} sent, ${result.data.failed} failed, ${result.data.skipped} skipped (missing contact info).`)
      }
      setSelected(new Set())
    })
    })
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "EMAIL" | "SMS")}>
              <TabsList>
                <TabsTrigger value="EMAIL">Email</TabsTrigger>
                <TabsTrigger value="SMS" className="gap-1.5">SMS <ComingSoonBadge className="px-1.5 py-0 text-[9px] tracking-[0.1em]" /></TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "SMS" ? (
              <SmsComingSoonCard />
            ) : (
            <div className="space-y-4">
            <Select value={type} onValueChange={(v) => { setType(v as typeof type); setBody(TEMPLATES[v]) }}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INVITATION">Invitation</SelectItem>
                <SelectItem value="REMINDER">Reminder</SelectItem>
                <SelectItem value="CUSTOM">Custom message</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." />
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" className="text-xs h-6" onClick={() => setBody((b) => b + v)}>{v}</Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Schedule for later (optional)</label>
              <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-56" />
            </div>
            <Button onClick={handleSend} disabled={pending}>
              <Send className="size-4" /> {scheduledFor ? "Schedule" : "Send"} to {selected.size} guest{selected.size === 1 ? "" : "s"}
            </Button>
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Delivery log</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Guest</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>When</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No messages sent yet.</TableCell></TableRow>}
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{l.guest ? `${l.guest.firstName} ${l.guest.lastName ?? ""}` : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.channel}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={l.status === "FAILED" ? "destructive" : "secondary"}>{l.status}{l.isMock ? " (mock)" : ""}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {!providersConfigured && (
          <Alert>
            <Info className="size-4" />
            <AlertDescription>Email isn&apos;t configured — messages send in clearly-labeled MOCK MODE and won&apos;t actually be delivered.</AlertDescription>
          </Alert>
        )}
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Guests ({eligibleGuests.length})</p>
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={selected.size > 0 && selected.size === eligibleGuests.length} onCheckedChange={(c) => toggleAll(!!c)} /> All
              </label>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {eligibleGuests.map((g) => (
                <label key={g.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-secondary/50 cursor-pointer">
                  <Checkbox checked={selected.has(g.id)} onCheckedChange={(c) => toggleOne(g.id, !!c)} />
                  <span className="flex-1 truncate">{g.firstName} {g.lastName}</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">{g.rsvpStatus}</Badge>
                </label>
              ))}
              {eligibleGuests.length === 0 && <p className="text-xs text-muted-foreground p-2">No guests have an email on file.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
