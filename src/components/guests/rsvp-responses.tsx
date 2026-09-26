"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Check, X, HelpCircle, CircleDashed, Search, SlidersHorizontal, Users, Mail, Phone, Pencil, Armchair, ScanLine,
  Undo2, Send, Link as LinkIcon, Copy, ChevronRight, MessageSquareText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GuestFormDialog } from "@/components/guests/guest-form-dialog"
import { hostUpdateRsvp, resendInvitation, setGuestTable } from "@/actions/rsvp-admin"
import { checkInGuest, undoCheckIn } from "@/actions/checkin"
import { formatDate, formatDateTime } from "@/lib/timezone"
import { copyText } from "@/lib/copy-text"
import { safe } from "@/lib/safe-action"
import { cn } from "@/lib/utils"

type Status = "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"

export type RsvpSummary = { invited: number; attending: number; declined: number; pending: number; maybe: number; attendees: number; showMaybe: boolean }

export type ResponseGuest = {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  facebookProfileUrl: string | null
  category: string | null
  notes: string | null
  rsvpStatus: Status
  rsvpAnswer: string | null
  rsvpMessage: string | null
  rsvpToken: string
  numberAttending: number | null
  respondedAt: string | null
  rsvpFirstRespondedAt: string | null
  updatedAt: string
  plusOneAllowed: boolean
  maxPlusOnes: number
  childrenCount: number
  mealPreference: string | null
  dietaryRestrictions: string | null
  groupId: string | null
  checkedIn: boolean
  checkedInAt: string | null
  plusOnes: { id: string; name: string | null }[]
  answers: { questionId: string; value: string }[]
  chair: { seatNumber: number; table: { id: string; name: string } } | null
}

type TableOption = { id: string; name: string; free: number }

const STATUS: Record<Status, { label: string; icon: typeof Check; className: string }> = {
  ATTENDING: { label: "Attending", icon: Check, className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  DECLINED: { label: "Not attending", icon: X, className: "bg-rose-50 text-rose-800 border-rose-200" },
  MAYBE: { label: "Maybe", icon: HelpCircle, className: "bg-amber-50 text-amber-800 border-amber-200" },
  PENDING: { label: "No response", icon: CircleDashed, className: "bg-muted text-muted-foreground border-border" },
}

const PAGE = 60
const fullName = (g: { firstName: string; lastName: string | null }) => `${g.firstName} ${g.lastName ?? ""}`.trim()
const dateLong = (iso: string) => formatDate(iso, { month: "long", day: "numeric", year: "numeric" })
const dateTime = (iso: string) => formatDateTime(iso, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
const guestsCount = (g: ResponseGuest) => (g.rsvpStatus === "ATTENDING" ? Math.max(1, g.numberAttending ?? 1) : 0)

function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const s = STATUS[status]
  const Icon = s.icon
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", s.className, className)}>
      <Icon className="size-3.5" aria-hidden /> {s.label}
    </span>
  )
}

type StatusFilter = "ALL" | Status
type SortKey = "name-asc" | "name-desc" | "recent" | "oldest"

/**
 * The host's RSVP dashboard: summary cards, a searchable/filterable list (a table on wide screens, cards on
 * phones and tablets — never a table you have to drag sideways) and a detail panel per guest with actions.
 */
export function RsvpResponses({
  eventId, summary, guests, questions, tables, mealOptions, invitationUrl, invitationLive, rsvpBaseUrl, allowMaybe,
}: {
  eventId: string
  summary: RsvpSummary
  guests: ResponseGuest[]
  questions: { id: string; label: string }[]
  tables: TableOption[]
  mealOptions: string[]
  invitationUrl: string
  invitationLive: boolean
  rsvpBaseUrl: string
  allowMaybe: boolean
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [checkin, setCheckin] = useState<"ALL" | "IN" | "OUT">("ALL")
  const [table, setTable] = useState<string>("ALL")
  const [sort, setSort] = useState<SortKey>("name-asc")
  const [visible, setVisible] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ResponseGuest | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const open = openId ? guests.find((g) => g.id === openId) ?? null : null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = guests.filter((g) => {
      if (status !== "ALL" && g.rsvpStatus !== status) return false
      if (checkin === "IN" && !g.checkedIn) return false
      if (checkin === "OUT" && g.checkedIn) return false
      if (table === "NONE" && g.chair) return false
      if (table !== "ALL" && table !== "NONE" && g.chair?.table.id !== table) return false
      if (!q) return true
      return `${fullName(g)} ${g.email ?? ""} ${g.phone ?? ""} ${g.category ?? ""}`.toLowerCase().includes(q)
    })
    const byName = (a: ResponseGuest, b: ResponseGuest) => fullName(a).localeCompare(fullName(b), undefined, { sensitivity: "base" })
    const time = (g: ResponseGuest) => (g.respondedAt ? new Date(g.respondedAt).getTime() : null)
    return list.sort((a, b) => {
      if (sort === "name-asc") return byName(a, b)
      if (sort === "name-desc") return byName(b, a)
      const ta = time(a), tb = time(b)
      if (ta === null && tb === null) return byName(a, b)
      if (ta === null) return 1 // guests who haven't responded go last either way
      if (tb === null) return -1
      return sort === "recent" ? tb - ta : ta - tb
    })
  }, [guests, search, status, checkin, table, sort])

  const shown = filtered.slice(0, visible)
  const activeFilters = (status !== "ALL" ? 1 : 0) + (checkin !== "ALL" ? 1 : 0) + (table !== "ALL" ? 1 : 0)
  const reset = () => { setStatus("ALL"); setCheckin("ALL"); setTable("ALL"); setVisible(PAGE) }

  const cards: Array<{ key: StatusFilter | "ATTENDEES"; label: string; value: number; hint?: string }> = [
    { key: "ALL", label: "Total invited", value: summary.invited },
    { key: "ATTENDING", label: "Attending", value: summary.attending },
    { key: "DECLINED", label: "Not attending", value: summary.declined },
    { key: "PENDING", label: "Pending", value: summary.pending, hint: summary.showMaybe && summary.maybe ? `+ ${summary.maybe} maybe` : undefined },
    { key: "ATTENDEES", label: "Total attendees", value: summary.attendees, hint: "incl. plus-ones" },
  ]

  const filterControls = (
    <>
      <Field label="RSVP status">
        <Select value={status} onValueChange={(v) => { setStatus(v as StatusFilter); setVisible(PAGE) }}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ATTENDING">Attending</SelectItem>
            <SelectItem value="DECLINED">Not attending</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            {(allowMaybe || summary.maybe > 0) && <SelectItem value="MAYBE">Maybe</SelectItem>}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Check-in">
        <Select value={checkin} onValueChange={(v) => { setCheckin(v as "ALL" | "IN" | "OUT"); setVisible(PAGE) }}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="IN">Checked in</SelectItem>
            <SelectItem value="OUT">Not checked in</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Table">
        <Select value={table} onValueChange={(v) => { setTable(v); setVisible(PAGE) }}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All tables</SelectItem>
            <SelectItem value="NONE">No table yet</SelectItem>
            {tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Sort by">
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A–Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z–A)</SelectItem>
            <SelectItem value="recent">Newest response</SelectItem>
            <SelectItem value="oldest">Oldest response</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  )

  return (
    <div className="space-y-5 min-w-0">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => {
          const active = c.key !== "ATTENDEES" && c.key === status
          const clickable = c.key !== "ATTENDEES"
          return (
            <button
              key={c.label}
              type="button"
              disabled={!clickable}
              onClick={() => { if (!clickable) return; setStatus(c.key as StatusFilter); setVisible(PAGE) }}
              className={cn("rounded-xl border bg-card p-4 text-left transition-colors min-w-0", clickable && "cursor-pointer hover:bg-secondary/60", active && "ring-2 ring-primary", c.key === "ATTENDEES" && "col-span-2 sm:col-span-1")}
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{c.label}</p>
              <p className="mt-1 font-heading text-3xl font-bold tabular-nums">{c.value}</p>
              {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
            <Input placeholder="Search guest" aria-label="Search guest" value={search} onChange={(e) => { setSearch(e.target.value); setVisible(PAGE) }} className="pl-8" />
          </div>
          <Button variant="outline" className="lg:hidden shrink-0" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="size-4" /> Filters{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
        </div>
        <div className="hidden lg:grid grid-cols-4 gap-3">{filterControls}</div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{filtered.length} of {guests.length} guest{guests.length === 1 ? "" : "s"}</span>
          {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>}
        </div>
      </div>

      {guests.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">No guests yet. Add guests on the Guests page and their RSVPs will show up here.</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No guests match these filters.</div>
      ) : (
        <>
          {/* Wide screens: a table. */}
          <div className="hidden xl:block rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>RSVP</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
                  <TableHead>Response date</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((g) => (
                  <TableRow key={g.id} className="cursor-pointer" onClick={() => setOpenId(g.id)}>
                    <TableCell className="max-w-[240px]">
                      <p className="font-medium truncate">{fullName(g)}</p>
                      <p className="text-xs text-muted-foreground truncate">{g.email || g.phone || "No contact details"}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={g.rsvpStatus} /></TableCell>
                    <TableCell className="text-center tabular-nums">{g.rsvpStatus === "ATTENDING" ? guestsCount(g) : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{g.respondedAt ? dateLong(g.respondedAt) : "—"}</TableCell>
                    <TableCell className="text-sm">{g.checkedIn ? <span className="text-emerald-700 font-medium">Checked in</span> : <span className="text-muted-foreground">Not yet</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{g.chair ? `${g.chair.table.name} · Seat ${g.chair.seatNumber}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setOpenId(g.id) }}>View details <ChevronRight className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phones and tablets: cards, so nothing needs sideways scrolling. */}
          <ul className="grid gap-3 sm:grid-cols-2 xl:hidden">
            {shown.map((g) => (
              <li key={g.id} className="min-w-0">
                <button type="button" onClick={() => setOpenId(g.id)} className="w-full rounded-xl border bg-card p-4 text-left space-y-2 cursor-pointer hover:bg-secondary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold break-words min-w-0">{fullName(g)}</p>
                    <StatusBadge status={g.rsvpStatus} className="shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {g.rsvpStatus === "ATTENDING" && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {guestsCount(g)} guest{guestsCount(g) === 1 ? "" : "s"}</span>}
                    <span>{g.respondedAt ? dateLong(g.respondedAt) : "No response yet"}</span>
                    {g.chair && <span className="inline-flex items-center gap-1"><Armchair className="size-3.5" aria-hidden /> {g.chair.table.name}</span>}
                    {g.checkedIn && <span className="text-emerald-700 font-medium">Checked in</span>}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">View details <ChevronRight className="size-4" aria-hidden /></span>
                </button>
              </li>
            ))}
          </ul>

          {filtered.length > shown.length && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE)}>Show more ({filtered.length - shown.length} more)</Button>
            </div>
          )}
        </>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter & sort</SheetTitle>
            <SheetDescription>Showing {filtered.length} of {guests.length} guests.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-6">
            {filterControls}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Clear</Button>
              <Button className="flex-1" onClick={() => setFiltersOpen(false)}>Show {filtered.length}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <GuestDrawer
        key={open?.id ?? "none"}
        eventId={eventId}
        guest={open}
        questions={questions}
        tables={tables}
        mealOptions={mealOptions}
        allowMaybe={allowMaybe}
        invitationUrl={invitationUrl}
        invitationLive={invitationLive}
        rsvpBaseUrl={rsvpBaseUrl}
        onOpenChange={(o) => { if (!o) setOpenId(null) }}
        onEditGuest={() => { setEditing(open); setOpenId(null) }}
      />
      <GuestFormDialog eventId={eventId} open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }} guest={editing} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5 min-w-0"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function GuestDrawer({
  eventId, guest, questions, tables, mealOptions, allowMaybe, invitationUrl, invitationLive, rsvpBaseUrl, onOpenChange, onEditGuest,
}: {
  eventId: string
  guest: ResponseGuest | null
  questions: { id: string; label: string }[]
  tables: TableOption[]
  mealOptions: string[]
  allowMaybe: boolean
  invitationUrl: string
  invitationLive: boolean
  rsvpBaseUrl: string
  onOpenChange: (open: boolean) => void
  onEditGuest: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editingRsvp, setEditingRsvp] = useState(false)
  const [form, setForm] = useState(() => ({
    status: guest?.rsvpStatus ?? "PENDING",
    count: guest ? Math.max(1, guest.numberAttending ?? 1) : 1,
    meal: guest?.mealPreference ?? "",
    message: guest?.rsvpMessage ?? "",
  }))

  function run<T>(action: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, success: (data: T) => string | null) {
    startTransition(async () => {
      const res = await safe(action())
      if (!res.ok) return void toast.error(res.error)
      const message = success(res.data)
      if (message) toast.success(message)
      router.refresh()
    })
  }

  if (!guest) return null
  const answered = new Map(guest.answers.map((a) => [a.questionId, a.value]))
  const maxAttending = 1 + (guest.plusOneAllowed ? guest.maxPlusOnes : 0)
  const personalLink = `${rsvpBaseUrl}/${guest.rsvpToken}`
  const plusOneNames = guest.plusOnes.map((p) => p.name).filter(Boolean) as string[]

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full data-[side=right]:w-full data-[side=right]:sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl break-words pr-6">{fullName(guest)}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={guest.rsvpStatus} />
              {guest.category && <span className="rounded-full border px-2.5 py-0.5 text-xs">{guest.category}</span>}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <section aria-labelledby="rsvp-answers">
            <h3 id="rsvp-answers" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">RSVP</h3>
            <dl className="divide-y">
              <Detail label="Answer">{guest.rsvpAnswer ?? (guest.rsvpStatus === "PENDING" ? "No response yet" : STATUS[guest.rsvpStatus].label)}</Detail>
              {guest.rsvpStatus === "ATTENDING" && <Detail label="Guests">{guestsCount(guest)} <span className="text-muted-foreground">(invitation allows {maxAttending})</span></Detail>}
              {plusOneNames.length > 0 && <Detail label="Plus-ones">{plusOneNames.join(", ")}</Detail>}
              {guest.mealPreference && <Detail label="Meal">{guest.mealPreference}</Detail>}
              {guest.dietaryRestrictions && <Detail label="Dietary">{guest.dietaryRestrictions}</Detail>}
              {questions.map((q) => answered.get(q.id) ? <Detail key={q.id} label={q.label}>{answered.get(q.id)}</Detail> : null)}
              {guest.rsvpMessage && <Detail label="Message"><span className="whitespace-pre-line">“{guest.rsvpMessage}”</span></Detail>}
              <Detail label="Responded">{guest.rsvpFirstRespondedAt ? dateTime(guest.rsvpFirstRespondedAt) : guest.respondedAt ? dateTime(guest.respondedAt) : "—"}</Detail>
              <Detail label="Last updated">{guest.respondedAt ? dateTime(guest.respondedAt) : "—"}</Detail>
            </dl>
          </section>

          {editingRsvp ? (
            <section className="space-y-3 rounded-xl border p-4" aria-label="Edit RSVP">
              <Field label="RSVP status">
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTENDING">Attending</SelectItem>
                    <SelectItem value="DECLINED">Not attending</SelectItem>
                    {(allowMaybe || guest.rsvpStatus === "MAYBE") && <SelectItem value="MAYBE">Maybe</SelectItem>}
                    <SelectItem value="PENDING">No response (pending)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.status === "ATTENDING" && (
                <>
                  <Field label={`Guests attending (up to ${maxAttending})`}>
                    <Input type="number" inputMode="numeric" min={1} max={maxAttending} value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: Math.min(maxAttending, Math.max(1, Number(e.target.value) || 1)) }))} className="w-28" />
                  </Field>
                  <Field label="Meal">
                    {mealOptions.length ? (
                      <Select value={form.meal || "__none"} onValueChange={(v) => setForm((f) => ({ ...f, meal: v === "__none" ? "" : v }))}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Not chosen</SelectItem>
                          {mealOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : <Input value={form.meal} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value }))} />}
                  </Field>
                </>
              )}
              {form.status !== "PENDING" && (
                <Field label="Message"><Textarea rows={2} maxLength={1000} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} /></Field>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingRsvp(false)} disabled={pending}>Cancel</Button>
                <Button className="flex-1" disabled={pending} onClick={() => run(
                  () => hostUpdateRsvp(eventId, guest.id, { status: form.status, numberAttending: form.count, mealPreference: form.meal, message: form.message }),
                  () => { setEditingRsvp(false); return "RSVP updated." },
                )}>{pending ? "Saving..." : "Save RSVP"}</Button>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="guest-contact">
            <h3 id="guest-contact" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Guest</h3>
            <dl className="divide-y">
              <Detail label="Email">{guest.email ? <a className="inline-flex items-center gap-1 hover:underline break-all" href={`mailto:${guest.email}`}><Mail className="size-3.5 shrink-0" aria-hidden />{guest.email}</a> : "—"}</Detail>
              <Detail label="Phone">{guest.phone ? <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${guest.phone.replace(/[^\d+]/g, "")}`}><Phone className="size-3.5 shrink-0" aria-hidden />{guest.phone}</a> : "—"}</Detail>
              {guest.notes && <Detail label="Notes"><span className="whitespace-pre-line">{guest.notes}</span></Detail>}
              <Detail label="Check-in">{guest.checkedIn ? `Checked in${guest.checkedInAt ? ` · ${dateTime(guest.checkedInAt)}` : ""}` : "Not checked in"}</Detail>
              <Detail label="Table">{guest.chair ? `${guest.chair.table.name} · Seat ${guest.chair.seatNumber}` : "Not assigned"}</Detail>
            </dl>
          </section>

          <section className="space-y-3" aria-labelledby="guest-actions">
            <h3 id="guest-actions" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onEditGuest}><Pencil className="size-4" /> Edit guest</Button>
              <Button variant="outline" onClick={() => setEditingRsvp((v) => !v)}><MessageSquareText className="size-4" /> Edit RSVP</Button>
              {guest.checkedIn ? (
                <Button variant="outline" disabled={pending} onClick={() => run(() => undoCheckIn(eventId, guest.id), () => "Check-in undone.")}><Undo2 className="size-4" /> Uncheck</Button>
              ) : (
                <Button variant="outline" disabled={pending} onClick={() => run(() => checkInGuest(eventId, guest.id), (d) => `${d.name} checked in.`)}><ScanLine className="size-4" /> Check in</Button>
              )}
              <Button variant="outline" disabled={pending || !guest.email} title={guest.email ? undefined : "Add an email address first"}
                onClick={() => run(() => resendInvitation(eventId, guest.id), (d) => d.mock ? `Email isn't set up on this site yet, so nothing was delivered to ${d.to}. Copy the RSVP link instead.` : `Invitation emailed to ${d.to}.`)}>
                <Send className="size-4" /> Resend invite
              </Button>
              <Button variant="outline" onClick={() => copyText(invitationUrl, invitationLive ? "Invitation link copied." : "Invitation link copied. Note: it only opens for guests once the event is published.")}><LinkIcon className="size-4" /> Copy invite link</Button>
              <Button variant="outline" onClick={() => copyText(personalLink, `${guest.firstName}'s personal RSVP link copied.`)}><Copy className="size-4" /> Copy RSVP link</Button>
            </div>
            <Field label="Assign table">
              <Select value={guest.chair?.table.id ?? "__none"} disabled={pending || tables.length === 0}
                onValueChange={(v) => run(() => setGuestTable(eventId, guest.id, v === "__none" ? null : v), (d) => d.seatNumber ? `Seated at seat ${d.seatNumber}.` : "Removed from table.")}>
                <SelectTrigger className="w-full"><SelectValue placeholder={tables.length ? "Choose a table" : "No tables yet"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No table</SelectItem>
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={t.id} disabled={t.free === 0 && guest.chair?.table.id !== t.id}>
                      {t.name} {guest.chair?.table.id === t.id ? "(current)" : `(${t.free} free)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tables.length === 0 && <p className="text-xs text-muted-foreground">Create tables on the Seating page first.</p>}
            </Field>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
