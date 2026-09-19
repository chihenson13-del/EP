"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfMonth, endOfMonth,
} from "date-fns"
import {
  ChevronLeft, ChevronRight, Search, Download, Upload,
  Clock3, CalendarCheck2, CalendarClock, CalendarCheck, X,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEventTypeConfig, EVENT_TYPE_OPTIONS } from "@/lib/event-types"
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_STYLE } from "@/lib/booking-calendar"
import { buildCalendarItems, itemTouchesDay, type CalendarItem } from "./calendar-utils"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
import { DayView } from "./day-view"
import { AgendaView } from "./agenda-view"
import { EventDetailSheet } from "./event-detail-sheet"
import { CreateBookingDialog } from "./create-booking-dialog"
import { importIcsCalendar } from "@/actions/calendar"
import type { CalendarEvent, ImportedEvent, CalendarView, StatusFilter } from "./types"

export function BookingCalendar({ events, importedEvents }: { events: CalendarEvent[]; importedEvents: ImportedEvent[] }) {
  const router = useRouter()
  const [view, setView] = useState<CalendarView>("month")
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [dayListDate, setDayListDate] = useState<Date | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allItems = useMemo(() => buildCalendarItems(events, importedEvents), [events, importedEvents])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allItems.filter((item) => {
      if (item.kind === "event") {
        if (statusFilter !== "ALL" && item.bookingStatus !== statusFilter) return false
        if (typeFilter !== "ALL" && item.raw.type !== typeFilter) return false
        if (q) {
          const typeConfig = getEventTypeConfig(item.raw.type)
          const haystack = [item.raw.name, item.raw.venueName ?? "", typeConfig.label, item.raw.ownerName].join(" ").toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      }
      // imported items: only shown under "All" status/type filters, still searchable
      if (statusFilter !== "ALL" || typeFilter !== "ALL") return false
      if (q && !item.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [allItems, search, statusFilter, typeFilter])

  // Summary counts always come from the full, unfiltered event set — real DB-derived numbers.
  const summary = useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    let thisMonthConfirmed = 0, upcoming30 = 0, pending = 0, completed = 0
    for (const item of allItems) {
      if (item.kind !== "event") continue
      if (item.bookingStatus === "CONFIRMED" && item.start >= monthStart && item.start <= monthEnd) thisMonthConfirmed++
      if (item.bookingStatus === "CONFIRMED" && item.start >= now && item.start <= in30Days) upcoming30++
      if (item.bookingStatus === "PENDING") pending++
      if (item.bookingStatus === "COMPLETED") completed++
    }
    return { thisMonthConfirmed, upcoming30, pending, completed }
  }, [allItems])

  const todayItems = useMemo(() => allItems.filter((it) => itemTouchesDay(it, new Date())), [allItems])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return allItems
      .filter((it): it is Extract<CalendarItem, { kind: "event" }> => it.kind === "event" && it.bookingStatus === "CONFIRMED" && it.start >= now)
      .slice(0, 5)
  }, [allItems])

  function goToday() { setAnchorDate(new Date()) }
  function goPrev() {
    setAnchorDate((d) => (view === "month" ? subMonths(d, 1) : view === "week" ? subWeeks(d, 1) : subDays(d, 1)))
  }
  function goNext() {
    setAnchorDate((d) => (view === "month" ? addMonths(d, 1) : view === "week" ? addWeeks(d, 1) : addDays(d, 1)))
  }

  function openItem(item: CalendarItem) {
    if (item.kind === "event") setSelectedEvent(item.raw)
  }

  async function handleImportFile(file: File) {
    setImporting(true)
    const text = await file.text()
    const result = await importIcsCalendar(text)
    setImporting(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Imported ${result.data.imported} event${result.data.imported === 1 ? "" : "s"}${result.data.skipped ? ` (${result.data.skipped} already imported)` : ""}.`)
    router.refresh()
  }

  const monthYearLabel = view === "day" ? format(anchorDate, "MMMM d, yyyy") : format(anchorDate, "MMMM yyyy")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Booking Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Your events, all in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/calendar/export"><Download className="size-3.5" /> Export Calendar</a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="size-3.5" /> {importing ? "Importing..." : "Import Calendar"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = "" }}
          />
        </div>
      </div>

      {/* Booking summary — real DB-derived counts, no hardcoded numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={CalendarCheck} label="This month" value={summary.thisMonthConfirmed} sub="Confirmed bookings" />
        <SummaryCard icon={CalendarClock} label="Upcoming" value={summary.upcoming30} sub="Next 30 days" />
        <SummaryCard icon={Clock3} label="Pending" value={summary.pending} sub="Awaiting confirmation" />
        <SummaryCard icon={CalendarCheck2} label="Completed" value={summary.completed} sub="Completed events" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4 min-w-0">
          {/* Search + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Events</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Event Type</SelectItem>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
              <Button variant="ghost" size="icon-sm" onClick={goPrev}><ChevronLeft className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={goNext}><ChevronRight className="size-4" /></Button>
              <span className="font-heading text-lg font-semibold ml-1">{monthYearLabel}</span>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {view === "month" && (
            <MonthView anchorDate={anchorDate} items={filteredItems} onEventClick={openItem} onDateClick={setCreateDate} onShowMore={setDayListDate} />
          )}
          {view === "week" && (
            <WeekView anchorDate={anchorDate} items={filteredItems} onEventClick={openItem} onDateClick={setCreateDate} />
          )}
          {view === "day" && (
            <DayView anchorDate={anchorDate} items={filteredItems} onEventClick={openItem} onDateClick={setCreateDate} />
          )}
          {view === "agenda" && <AgendaView items={filteredItems} onEventClick={openItem} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3 border-border/70">
            <h3 className="font-heading font-semibold text-sm">Today</h3>
            {todayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events scheduled today.</p>
            ) : (
              <div className="space-y-2">
                {todayItems.map((item) => (
                  <button key={item.id} onClick={() => openItem(item)} className="w-full text-left rounded-lg border border-border/60 p-2.5 hover:bg-secondary/30 transition-colors">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.allDay ? "All day" : format(item.start, "h:mm a")}
                      {item.kind === "event" && item.raw.venueName ? ` · ${item.raw.venueName}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3 border-border/70">
            <h3 className="font-heading font-semibold text-sm">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming confirmed bookings.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((item) => (
                  <button key={item.id} onClick={() => openItem(item)} className="w-full text-left rounded-lg border border-border/60 p-2.5 hover:bg-secondary/30 transition-colors">
                    <p className="text-xs text-muted-foreground">{format(item.start, "MMM d")} · {format(item.start, "h:mm a")}</p>
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.raw.ownerName || "You"}</p>
                  </button>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setView("agenda")}>View Calendar</Button>
          </Card>

          <Card className="p-4 space-y-2 border-border/70 bg-secondary/30">
            <p className="text-xs font-medium text-muted-foreground">Calendar integrations</p>
            <p className="text-sm text-muted-foreground">Google Calendar and Outlook sync are coming soon.</p>
          </Card>
        </div>
      </div>

      {dayListDate && (
        <DayListDialog date={dayListDate} items={filteredItems.filter((it) => itemTouchesDay(it, dayListDate))} onClose={() => setDayListDate(null)} onEventClick={(item) => { setDayListDate(null); openItem(item) }} />
      )}

      <EventDetailSheet event={selectedEvent} open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)} />
      <CreateBookingDialog date={createDate} onOpenChange={(open) => !open && setCreateDate(null)} />
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; sub: string }) {
  return (
    <Card className="p-4 border-border/70">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="font-heading text-3xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </Card>
  )
}

function DayListDialog({ date, items, onClose, onEventClick }: { date: Date; items: CalendarItem[]; onClose: () => void; onEventClick: (item: CalendarItem) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm p-4 space-y-3 border-border/70" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold">{format(date, "MMMM d, yyyy")}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {items.map((item) => (
            <button key={item.id} onClick={() => onEventClick(item)} className="w-full text-left rounded-lg border border-border/60 p-2.5 hover:bg-secondary/30 transition-colors">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.allDay ? "All day" : format(item.start, "h:mm a")}</p>
              {item.kind === "event" && (
                <Badge variant="outline" className={`mt-1 text-[10px] ${BOOKING_STATUS_STYLE[item.bookingStatus]}`}>
                  {BOOKING_STATUS_LABEL[item.bookingStatus]}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
