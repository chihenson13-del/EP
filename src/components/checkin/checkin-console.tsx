"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Search, ScanLine, Undo2, CheckCircle2, Camera, Keyboard, AlertTriangle, XCircle, Armchair, Users } from "lucide-react"
import { checkInGuest, undoCheckIn, checkInByCode, type ScanResult } from "@/actions/checkin"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrScanner } from "@/components/checkin/qr-scanner"
import { formatDateTime } from "@/lib/timezone"
import { safe } from "@/lib/safe-action"
import { cn } from "@/lib/utils"

type Status = "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"
type Guest = { id: string; firstName: string; lastName: string | null; category: string | null; checkedIn: boolean; checkedInAt: string | null; rsvpStatus: Status; partySize: number; seat: string | null }
type Filter = "expected" | "waiting" | "in" | "all"
type LastScan = { ok: true; result: ScanResult } | { ok: false; error: string }

const STATUS_LABEL: Record<Status, string> = { ATTENDING: "Attending", DECLINED: "Not attending", MAYBE: "Maybe", PENDING: "No RSVP" }
const time = (iso: string) => formatDateTime(iso, { hour: "numeric", minute: "2-digit" })

/**
 * The door screen. Built for a phone held in one hand: a big "Scan" button that opens the camera, the result of
 * each scan in large type (name, party size, table), and a searchable list with one-tap check-in for anyone
 * without their QR code — including guests who never RSVP'd.
 */
export function CheckInConsole({ eventId, guests }: { eventId: string; guests: Guest[] }) {
  const [list, setList] = useState(guests)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("expected")
  const [scanning, setScanning] = useState(false)
  const [typing, setTyping] = useState(false)
  const [code, setCode] = useState("")
  const [last, setLast] = useState<LastScan | null>(null)
  const [pending, startTransition] = useTransition()

  const attending = list.filter((g) => g.rsvpStatus === "ATTENDING")
  const inside = list.filter((g) => g.checkedIn)
  const stats = {
    expected: attending.length,
    expectedPeople: attending.reduce((n, g) => n + g.partySize, 0),
    in: inside.length,
    inPeople: inside.reduce((n, g) => n + g.partySize, 0),
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((g) => {
      if (q) return `${g.firstName} ${g.lastName ?? ""} ${g.category ?? ""}`.toLowerCase().includes(q) // search looks at everyone
      if (filter === "expected") return g.rsvpStatus === "ATTENDING" || g.checkedIn
      if (filter === "waiting") return g.rsvpStatus === "ATTENDING" && !g.checkedIn
      if (filter === "in") return g.checkedIn
      return true
    })
  }, [list, search, filter])

  function markIn(id: string, value: boolean) {
    setList((prev) => prev.map((g) => (g.id === id ? { ...g, checkedIn: value, checkedInAt: value ? new Date().toISOString() : null } : g)))
  }

  function handleCheckIn(g: Guest) {
    startTransition(async () => {
      const result = await safe(checkInGuest(eventId, g.id))
      if (!result.ok) return void toast.error(result.error)
      markIn(g.id, true)
      toast.success(`${result.data.name} checked in${g.seat ? ` · ${g.seat}` : ""}.`)
    })
  }

  function handleUndo(g: Guest) {
    startTransition(async () => {
      const result = await safe(undoCheckIn(eventId, g.id))
      if (!result.ok) return void toast.error(result.error)
      markIn(g.id, false)
      toast.success(`Check-in undone for ${g.firstName}.`)
    })
  }

  function handleCode(text: string) {
    const value = text.trim()
    if (!value) return
    startTransition(async () => {
      const result = await safe(checkInByCode(eventId, value))
      if (!result.ok) {
        setLast({ ok: false, error: result.error })
        if (!scanning) toast.error(result.error)
        return
      }
      setLast({ ok: true, result: result.data })
      if (!result.data.alreadyCheckedIn) markIn(result.data.guestId, true)
      if (!scanning) {
        if (result.data.alreadyCheckedIn) toast.warning(`${result.data.name} is already checked in.`)
        else toast.success(`${result.data.name} checked in.`)
      }
    })
  }

  const lastPanel = last && (
    last.ok ? (
      <div className={cn("rounded-2xl p-4", last.result.alreadyCheckedIn ? "bg-amber-400 text-amber-950" : "bg-emerald-500 text-white")} role="status">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          {last.result.alreadyCheckedIn ? <AlertTriangle className="size-5" aria-hidden /> : <CheckCircle2 className="size-5" aria-hidden />}
          {last.result.alreadyCheckedIn ? "Already checked in" : "Checked in"}
        </p>
        <p className="mt-1 text-2xl font-bold leading-tight break-words">{last.result.name}</p>
        <p className="mt-1 text-sm font-medium">
          Party of {last.result.partySize}{last.result.seat ? ` · ${last.result.seat}` : " · No table assigned"}
          {last.result.rsvpStatus !== "ATTENDING" ? ` · RSVP: ${STATUS_LABEL[last.result.rsvpStatus]}` : ""}
        </p>
      </div>
    ) : (
      <div className="rounded-2xl bg-red-600 p-4 text-white" role="alert">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"><XCircle className="size-5" aria-hidden /> Not accepted</p>
        <p className="mt-1 text-base font-medium">{last.error}</p>
      </div>
    )
  )

  const chips: Array<[Filter, string]> = [["expected", "Expected"], ["waiting", "Not yet in"], ["in", "Checked in"], ["all", "Everyone"]]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 gap-0"><p className="text-xs sm:text-sm text-muted-foreground">Expected</p><p className="font-heading text-2xl font-bold tabular-nums">{stats.expected}</p><p className="text-[11px] text-muted-foreground">{stats.expectedPeople} people</p></Card>
        <Card className="p-3 sm:p-4 gap-0"><p className="text-xs sm:text-sm text-muted-foreground">Checked in</p><p className="font-heading text-2xl font-bold tabular-nums text-emerald-600">{stats.in}</p><p className="text-[11px] text-muted-foreground">{stats.inPeople} people</p></Card>
        <Card className="p-3 sm:p-4 gap-0"><p className="text-xs sm:text-sm text-muted-foreground">Still to come</p><p className="font-heading text-2xl font-bold tabular-nums">{Math.max(0, stats.expected - attending.filter((g) => g.checkedIn).length)}</p><p className="text-[11px] text-muted-foreground">of the attending list</p></Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button size="lg" className="h-14 text-base" onClick={() => { setLast(null); setScanning(true) }}><Camera className="size-5" /> Scan check-in QR</Button>
        <Button size="lg" variant="outline" className="h-14" onClick={() => setTyping((t) => !t)} aria-expanded={typing}><Keyboard className="size-5" /> Type a code</Button>
      </div>
      {typing && (
        <form onSubmit={(e) => { e.preventDefault(); handleCode(code); setCode("") }} className="flex gap-2">
          <Input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Check-in code or RSVP link" aria-label="Check-in code" className="h-11" />
          <Button type="submit" className="h-11" disabled={pending || !code.trim()}><ScanLine className="size-4" /> Check in</Button>
        </form>
      )}
      {!scanning && lastPanel}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <Input placeholder="Search any guest by name..." aria-label="Search guests" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-11" />
        </div>
        {!search.trim() && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
            {chips.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
                className={cn("min-h-9 rounded-full border px-3 text-sm font-medium cursor-pointer transition-colors", filter === key ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary")}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{search.trim() ? "No guest with that name." : "Nobody here yet."}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <li key={g.id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 min-w-0", g.checkedIn && "border-emerald-500/50 bg-emerald-50/50")}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold break-words">{g.firstName} {g.lastName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> Party of {g.partySize}</span>
                  {g.seat && <span className="inline-flex items-center gap-1"><Armchair className="size-3.5" aria-hidden /> {g.seat}</span>}
                  {g.rsvpStatus !== "ATTENDING" && <Badge variant="outline" className="text-[11px]">{STATUS_LABEL[g.rsvpStatus]}</Badge>}
                  {g.category && <Badge variant="outline" className="text-[11px]">{g.category}</Badge>}
                  {g.checkedIn && g.checkedInAt && <span className="font-medium text-emerald-700">In at {time(g.checkedInAt)}</span>}
                </div>
              </div>
              {g.checkedIn ? (
                <Button variant="outline" className="h-11 shrink-0" onClick={() => handleUndo(g)} disabled={pending}><Undo2 className="size-4" /> Undo</Button>
              ) : (
                <Button className="h-11 shrink-0" onClick={() => handleCheckIn(g)} disabled={pending}><CheckCircle2 className="size-4" /> Check in</Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {scanning && (
        <QrScanner
          onScan={handleCode}
          onClose={() => setScanning(false)}
          status={lastPanel ?? <p className="text-center text-sm opacity-80">{pending ? "Checking…" : `Checked in so far: ${stats.in} guests (${stats.inPeople} people)`}</p>}
        />
      )}
    </div>
  )
}
