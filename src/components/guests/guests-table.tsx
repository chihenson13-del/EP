"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Search, Plus, Upload, Download, Trash2, Pencil, Link as LinkIcon, MoreVertical, Eye, CheckSquare, Armchair, Users, Mail, Phone } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { GuestFormDialog } from "@/components/guests/guest-form-dialog"
import { GuestDetailsSheet } from "@/components/guests/guest-details-sheet"
import { MessengerIcon } from "@/components/guests/facebook-contact"
import { normalizeFacebookUrl } from "@/lib/facebook"
import { bulkDeleteGuests, bulkSetRsvpStatus, deleteGuest } from "@/actions/guests"
import { toCsv } from "@/lib/csv"

import { safe } from "@/lib/safe-action"
import { rsvpPath } from "@/lib/rsvp-settings"
import { copyText } from "@/lib/copy-text"
import { useLongPress, LONG_PRESS_CLASS } from "@/lib/use-long-press"
import { GuestQuickActions, SelectionBar, SelectTick, type QuickAction } from "@/components/guests/guest-quick-actions"
import { cn } from "@/lib/utils"

type Guest = {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  facebookProfileUrl: string | null
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

const STATUS_LABEL: Record<Guest["rsvpStatus"], string> = { ATTENDING: "Attending", DECLINED: "Not attending", MAYBE: "Maybe", PENDING: "Pending" }

/** Rows drawn at once. Search, filters, select-all and CSV export always work on the full list. */
const PAGE_SIZE = 100

export function GuestsTable({ eventId, eventSlug, guests, messengerLive = false }: { eventId: string; eventSlug: string; guests: Guest[]; messengerLive?: boolean }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilterState] = useState<string>("ALL")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const setStatusFilter = (v: string) => { setStatusFilterState(v); setVisibleCount(PAGE_SIZE) }
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Guest | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [focusField, setFocusField] = useState<"facebookProfileUrl" | undefined>(undefined)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const details = detailsId ? guests.find((g) => g.id === detailsId) ?? null : null
  // Press-and-hold menu and "select several" mode (phones and tablets; right-click on desktop).
  const [menuId, setMenuId] = useState<string | null>(null)
  const menuGuest = menuId ? guests.find((g) => g.id === menuId) ?? null : null
  const [selectMode, setSelectMode] = useState(false)
  const openMenu = useCallback((id: string) => setMenuId(id), [])
  const press = useLongPress<string>(openMenu)
  const selecting = selectMode || selected.size > 0

  function openEditor(guest: Guest | null, focus?: "facebookProfileUrl") {
    setEditing(guest)
    setFocusField(focus)
    setDialogOpen(true)
  }
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (statusFilter !== "ALL" && g.rsvpStatus !== statusFilter) return false
      if (!search.trim()) return true
      const haystack = `${g.firstName} ${g.lastName ?? ""} ${g.email ?? ""} ${g.phone ?? ""} ${g.category ?? ""} ${g.facebookProfileUrl ?? ""}`.toLowerCase()
      return haystack.includes(search.toLowerCase())
    })
  }, [guests, search, statusFilter])

  const shown = filtered.slice(0, visibleCount)

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
    const header = ["First Name", "Last Name", "Email", "Phone", "Facebook Profile", "Category", "RSVP Status", "Table", "Seat", "Checked In"]
    const rows = filtered.map((g) => [
      g.firstName, g.lastName ?? "", g.email ?? "", g.phone ?? "", g.facebookProfileUrl ?? "", g.category ?? "",
      g.rsvpStatus, g.chair?.table.name ?? "", g.chair?.seatNumber ?? "", g.checkedIn ? "Yes" : "No",
    ])
    const csv = toCsv([header, ...rows])
    downloadFile(csv, `guests-${eventSlug}.csv`, "text/csv")
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await safe(deleteGuest(eventId, id))
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
      const result = await safe(bulkDeleteGuests(eventId, Array.from(selected)))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`${selected.size} guest(s) removed.`)
      setSelected(new Set())
      setSelectMode(false)
    })
  }

  function handleBulkStatus(status: Guest["rsvpStatus"]) {
    if (!selected.size) return
    startTransition(async () => {
      const result = await safe(bulkSetRsvpStatus(eventId, Array.from(selected), status))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`${selected.size} guest(s) updated.`)
      setSelected(new Set())
      setSelectMode(false)
    })
  }

  function copyRsvpLink(token: string) {
    void copyText(`${window.location.origin}${rsvpPath(eventSlug, token)}`, "RSVP link copied.")
  }

  /** What the press-and-hold menu offers for one guest. */
  function guestActions(g: Guest): QuickAction[] {
    const isSelected = selected.has(g.id)
    const facebook = normalizeFacebookUrl(g.facebookProfileUrl)
    return [
      { key: "details", label: "View details", icon: Eye, onSelect: () => setDetailsId(g.id) },
      { key: "edit", label: "Edit guest", icon: Pencil, onSelect: () => openEditor(g) },
      {
        key: "select", label: isSelected ? "Unselect" : "Select", icon: CheckSquare, hint: isSelected ? undefined : "Choose several guests to update at once",
        onSelect: () => { setSelectMode(true); toggleOne(g.id, !isSelected) },
      },
      { key: "copy", label: "Copy RSVP link", icon: LinkIcon, hint: "Their personal link to respond", onSelect: () => copyRsvpLink(g.rsvpToken) },
      facebook
        ? { key: "fb", label: "Message on Facebook", icon: MessengerIcon, hint: "Opens Facebook; you write the message", onSelect: () => window.open(facebook, "_blank", "noopener,noreferrer") }
        : { key: "fb", label: "Add Facebook profile", icon: MessengerIcon, onSelect: () => openEditor(g, "facebookProfileUrl") },
      { key: "delete", label: "Delete guest", icon: Trash2, destructive: true, confirm: `Delete ${g.firstName}? Tap again to confirm`, onSelect: () => handleDelete(g.id) },
    ]
  }

  return (
    <div className={cn("space-y-4 min-w-0", selecting && "pb-36")}>
      {/* Toolbar: search + status on one row, actions below on phones (two per row), all in one row on wide screens. */}
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="flex gap-2 min-w-0 xl:flex-1">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
            <Input placeholder="Search guests..." aria-label="Search guests" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }} className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[8.5rem] sm:w-40 shrink-0" aria-label="Filter by RSVP status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ATTENDING">Attending</SelectItem>
              <SelectItem value="DECLINED">Not attending</SelectItem>
              <SelectItem value="MAYBE">Maybe</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button onClick={() => openEditor(null)}><Plus className="size-4" /> Add guest</Button>
          <Button variant="outline" className="xl:hidden" onClick={() => setSelectMode(true)} disabled={selecting || filtered.length === 0}><CheckSquare className="size-4" /> Select</Button>
          <Button variant="outline" onClick={handleExportCsv}><Download className="size-4" /> Export</Button>
          <Button variant="outline" asChild><Link href={`/dashboard/events/${eventId}/guests/import`}><Upload className="size-4" /> Import</Link></Button>
        </div>
      </div>

      {/* Wide screens: the full table (it fits from 1280px up). */}
      <div className="hidden xl:block rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={(c) => toggleAll(!!c)} aria-label="Select all guests" />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Plus-ones</TableHead>
              <TableHead>Seat</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No guests found.</TableCell></TableRow>
            )}
            {shown.map((g) => (
              <TableRow key={g.id} data-state={selected.has(g.id) ? "selected" : undefined}>
                <TableCell><Checkbox checked={selected.has(g.id)} onCheckedChange={(c) => toggleOne(g.id, !!c)} aria-label={`Select ${g.firstName}`} /></TableCell>
                <TableCell className="max-w-[220px]">
                  <button type="button" className={cn("block max-w-full text-left font-medium hover:underline underline-offset-2 break-words", LONG_PRESS_CLASS)} onClick={() => setDetailsId(g.id)} {...press(g.id)} title="Click for details · right-click for more">
                    {g.firstName} {g.lastName}
                  </button>
                  {g.category && <span className="block truncate text-xs text-muted-foreground">{g.category}</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                  <span className="block truncate">{g.email || g.phone || "—"}</span>
                  {g.facebookProfileUrl && <span className="block text-xs">Facebook saved</span>}
                </TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[g.rsvpStatus]}>{STATUS_LABEL[g.rsvpStatus]}</Badge></TableCell>
                <TableCell className="text-sm">{g.plusOnes.length}/{g.maxPlusOnes}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{g.chair ? `${g.chair.table.name} · #${g.chair.seatNumber}` : "—"}</TableCell>
                <TableCell>{g.checkedIn ? <Badge variant="default">Checked in</Badge> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`More for ${g.firstName}`}><MoreVertical className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailsId(g.id)}><Eye className="size-3.5" /> View details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditor(g)}><Pencil className="size-3.5" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyRsvpLink(g.rsvpToken)}><LinkIcon className="size-3.5" /> Copy RSVP link</DropdownMenuItem>
                      {normalizeFacebookUrl(g.facebookProfileUrl)
                        ? <DropdownMenuItem onClick={() => window.open(normalizeFacebookUrl(g.facebookProfileUrl)!, "_blank", "noopener,noreferrer")}><MessengerIcon /> Message on Facebook</DropdownMenuItem>
                        : <DropdownMenuItem onClick={() => openEditor(g, "facebookProfileUrl")}><MessengerIcon /> Add Facebook profile</DropdownMenuItem>}
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(g.id)}><Trash2 className="size-3.5" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Phones and tablets (incl. iPad): cards that fit the screen — no sideways scrolling. Tap for details,
          press and hold for actions and "Select". */}
      <div className="xl:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No guests found.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{selecting ? "Tap guests to select them." : "Tap a guest for details. Press and hold for more options."}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {shown.map((g) => {
                const isSelected = selected.has(g.id)
                return (
                  <li key={g.id} className="min-w-0">
                    <button
                      type="button"
                      {...press(g.id)}
                      onClick={() => (selecting ? toggleOne(g.id, !isSelected) : setDetailsId(g.id))}
                      aria-pressed={selecting ? isSelected : undefined}
                      className={cn(
                        "w-full rounded-xl border bg-card p-3.5 text-left transition-colors cursor-pointer hover:bg-secondary/40 active:bg-secondary/60",
                        LONG_PRESS_CLASS,
                        isSelected && "border-primary ring-2 ring-primary/30 bg-primary/5",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {selecting && <SelectTick checked={isSelected} />}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold break-words min-w-0">{g.firstName} {g.lastName}</p>
                            <Badge variant={STATUS_VARIANT[g.rsvpStatus]} className="shrink-0">{STATUS_LABEL[g.rsvpStatus]}</Badge>
                          </div>
                          {(g.email || g.phone) && (
                            <p className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                              {g.email ? <Mail className="size-3.5 shrink-0" aria-hidden /> : <Phone className="size-3.5 shrink-0" aria-hidden />}
                              <span className="truncate">{g.email || g.phone}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {g.category && <span className="rounded-full border px-2 py-0.5">{g.category}</span>}
                            {g.maxPlusOnes > 0 && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> +{g.plusOnes.length}/{g.maxPlusOnes}</span>}
                            {g.chair && <span className="inline-flex items-center gap-1"><Armchair className="size-3.5" aria-hidden /> {g.chair.table.name} · #{g.chair.seatNumber}</span>}
                            {g.checkedIn && <span className="font-medium text-emerald-700">Checked in</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {filtered.length > shown.length && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>Showing {shown.length} of {filtered.length} guests</span>
          <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>Show more</Button>
        </div>
      )}

      {menuGuest && (
        <GuestQuickActions
          open={!!menuGuest}
          onOpenChange={(o) => { if (!o) setMenuId(null) }}
          title={`${menuGuest.firstName} ${menuGuest.lastName ?? ""}`.trim()}
          subtitle={<span className="flex flex-wrap items-center gap-2"><Badge variant={STATUS_VARIANT[menuGuest.rsvpStatus]}>{STATUS_LABEL[menuGuest.rsvpStatus]}</Badge>{menuGuest.email || menuGuest.phone ? <span className="truncate">{menuGuest.email || menuGuest.phone}</span> : null}</span>}
          actions={guestActions(menuGuest)}
        />
      )}
      {selecting && (
        <SelectionBar
          count={selected.size}
          total={filtered.length}
          pending={pending}
          onSelectAll={() => toggleAll(true)}
          onDone={() => { setSelected(new Set()); setSelectMode(false) }}
          actions={[
            { key: "attending", label: "Mark attending", onSelect: () => handleBulkStatus("ATTENDING") },
            { key: "declined", label: "Mark not attending", onSelect: () => handleBulkStatus("DECLINED") },
            { key: "pending", label: "Mark pending", onSelect: () => handleBulkStatus("PENDING") },
            { key: "delete", label: "Delete", destructive: true, confirm: `Delete ${selected.size}? Tap again`, onSelect: handleBulkDelete },
          ]}
        />
      )}

      <GuestFormDialog eventId={eventId} open={dialogOpen} onOpenChange={setDialogOpen} guest={editing} focusField={focusField} />
      <GuestDetailsSheet
        eventId={eventId}
        messengerLive={messengerLive}
        guest={details}
        open={!!details}
        onOpenChange={(open) => { if (!open) setDetailsId(null) }}
        onEdit={() => { const g = details; setDetailsId(null); openEditor(g) }}
        onAddFacebook={() => { const g = details; setDetailsId(null); openEditor(g, "facebookProfileUrl") }}
      />
    </div>
  )
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
