"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Search, Plus, Upload, Download, Trash2, Pencil, Link as LinkIcon, MoreVertical } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { GuestFormDialog } from "@/components/guests/guest-form-dialog"
import { bulkDeleteGuests, bulkSetRsvpStatus, deleteGuest } from "@/actions/guests"

type Guest = {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  category: string | null
  rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"
  rsvpToken: string
  checkedIn: boolean
  plusOneAllowed: boolean
  maxPlusOnes: number
  childrenCount: number
  mealPreference: string | null
  dietaryRestrictions: string | null
  notes: string | null
  plusOnes: { id: string; name: string | null }[]
  chair: { seatNumber: number; table: { name: string } } | null
}

const STATUS_VARIANT: Record<Guest["rsvpStatus"], "default" | "secondary" | "outline" | "destructive"> = {
  ATTENDING: "default",
  DECLINED: "destructive",
  MAYBE: "outline",
  PENDING: "secondary",
}

export function GuestsTable({ eventId, eventSlug, guests }: { eventId: string; eventSlug: string; guests: Guest[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Guest | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (statusFilter !== "ALL" && g.rsvpStatus !== statusFilter) return false
      if (!search.trim()) return true
      const haystack = `${g.firstName} ${g.lastName ?? ""} ${g.email ?? ""} ${g.phone ?? ""} ${g.category ?? ""}`.toLowerCase()
      return haystack.includes(search.toLowerCase())
    })
  }, [guests, search, statusFilter])

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map((g) => g.id)) : new Set())
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleExportCsv() {
    const header = ["First Name", "Last Name", "Email", "Phone", "Category", "RSVP Status", "Table", "Seat", "Checked In"]
    const rows = filtered.map((g) => [
      g.firstName, g.lastName ?? "", g.email ?? "", g.phone ?? "", g.category ?? "",
      g.rsvpStatus, g.chair?.table.name ?? "", g.chair?.seatNumber ?? "", g.checkedIn ? "Yes" : "No",
    ])
    const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n")
    downloadFile(csv, `guests-${eventSlug}.csv`, "text/csv")
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteGuest(eventId, id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Guest removed.")
    })
  }

  function handleBulkDelete() {
    if (!selected.size) return
    startTransition(async () => {
      const result = await bulkDeleteGuests(eventId, Array.from(selected))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`${selected.size} guest(s) removed.`)
      setSelected(new Set())
    })
  }

  function handleBulkStatus(status: Guest["rsvpStatus"]) {
    if (!selected.size) return
    startTransition(async () => {
      const result = await bulkSetRsvpStatus(eventId, Array.from(selected), status)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Updated.")
      setSelected(new Set())
    })
  }

  function copyRsvpLink(token: string) {
    const url = `${window.location.origin}/rsvp/${eventSlug}/${token}`
    navigator.clipboard.writeText(url)
    toast.success("RSVP link copied.")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search guests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ATTENDING">Attending</SelectItem>
            <SelectItem value="DECLINED">Declined</SelectItem>
            <SelectItem value="MAYBE">Maybe</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExportCsv}><Download className="size-4" /> Export</Button>
        <Button variant="outline" asChild><Link href={`/dashboard/events/${eventId}/guests/import`}><Upload className="size-4" /> Import</Link></Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="size-4" /> Add guest</Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus("ATTENDING")} disabled={pending}>Mark attending</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus("DECLINED")} disabled={pending}>Mark declined</Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={pending}><Trash2 className="size-3.5" /> Delete</Button>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={(c) => toggleAll(!!c)} />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Plus-ones</TableHead>
              <TableHead>Seat</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">No guests found.</TableCell></TableRow>
            )}
            {filtered.map((g) => (
              <TableRow key={g.id}>
                <TableCell><Checkbox checked={selected.has(g.id)} onCheckedChange={(c) => toggleOne(g.id, !!c)} /></TableCell>
                <TableCell className="font-medium">{g.firstName} {g.lastName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{g.email || g.phone || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{g.category || "—"}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[g.rsvpStatus]}>{g.rsvpStatus}</Badge></TableCell>
                <TableCell className="text-sm">{g.plusOnes.length}/{g.maxPlusOnes}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{g.chair ? `${g.chair.table.name} · #${g.chair.seatNumber}` : "—"}</TableCell>
                <TableCell>{g.checkedIn ? <Badge variant="default">Checked in</Badge> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8"><MoreVertical className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(g); setDialogOpen(true) }}><Pencil className="size-3.5" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyRsvpLink(g.rsvpToken)}><LinkIcon className="size-3.5" /> Copy RSVP link</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(g.id)}><Trash2 className="size-3.5" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <GuestFormDialog eventId={eventId} open={dialogOpen} onOpenChange={setDialogOpen} guest={editing} />
    </div>
  )
}

function escapeCsv(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
