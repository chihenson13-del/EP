"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Search, ScanLine, Undo2, CheckCircle2 } from "lucide-react"
import { checkInGuest, undoCheckIn, checkInByToken } from "@/actions/checkin"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Guest = { id: string; firstName: string; lastName: string | null; category: string | null; checkedIn: boolean; checkedInAt: string | null; rsvpToken: string; numberAttending: number | null }

export function CheckInConsole({ eventId, guests }: { eventId: string; guests: Guest[] }) {
  const [list, setList] = useState(guests)
  const [search, setSearch] = useState("")
  const [scanValue, setScanValue] = useState("")
  const [pending, startTransition] = useTransition()

  const expected = list.length
  const checkedIn = list.filter((g) => g.checkedIn).length

  const filtered = useMemo(
    () => list.filter((g) => `${g.firstName} ${g.lastName ?? ""} ${g.category ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    [list, search]
  )

  function handleCheckIn(id: string) {
    startTransition(async () => {
      const result = await checkInGuest(eventId, id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.map((g) => (g.id === id ? { ...g, checkedIn: true, checkedInAt: new Date().toISOString() } : g)))
      toast.success(`${result.data.name} checked in.`)
    })
  }

  function handleUndo(id: string) {
    startTransition(async () => {
      const result = await undoCheckIn(eventId, id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.map((g) => (g.id === id ? { ...g, checkedIn: false, checkedInAt: null } : g)))
    })
  }

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scanValue.trim()) return
    startTransition(async () => {
      const result = await checkInByToken(eventId, scanValue.trim())
      setScanValue("")
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.map((g) => (g.rsvpToken === scanValue.trim() ? { ...g, checkedIn: true, checkedInAt: new Date().toISOString() } : g)))
      toast.success(`${result.data.name} checked in.`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Expected</p><p className="font-heading text-2xl font-bold">{expected}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Checked in</p><p className="font-heading text-2xl font-bold text-emerald-600">{checkedIn}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Remaining</p><p className="font-heading text-2xl font-bold">{expected - checkedIn}</p></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleScanSubmit} className="flex items-center gap-2">
            <ScanLine className="size-5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Scan QR code or paste RSVP code, then press Enter"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
            />
            <Button type="submit" disabled={pending}>Check in</Button>
          </form>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search guest name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 max-w-sm" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((g) => (
          <Card key={g.id} className={g.checkedIn ? "border-emerald-500/40" : ""}>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{g.firstName} {g.lastName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {g.category && <Badge variant="outline" className="text-xs">{g.category}</Badge>}
                  {g.numberAttending ? <span className="text-xs text-muted-foreground">Party of {g.numberAttending}</span> : null}
                </div>
              </div>
              {g.checkedIn ? (
                <Button size="sm" variant="outline" onClick={() => handleUndo(g.id)} disabled={pending}>
                  <Undo2 className="size-3.5" /> Undo
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleCheckIn(g.id)} disabled={pending}>
                  <CheckCircle2 className="size-3.5" /> Check in
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
