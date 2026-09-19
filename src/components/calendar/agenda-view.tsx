"use client"

import { format } from "date-fns"
import { CalendarX } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_STYLE } from "@/lib/booking-calendar"
import { dateKey, type CalendarItem } from "./calendar-utils"

export function AgendaView({ items, onEventClick }: { items: CalendarItem[]; onEventClick: (item: CalendarItem) => void }) {
  if (items.length === 0) {
    return (
      <div className="border border-border/70 rounded-xl bg-card py-16 text-center text-muted-foreground">
        <CalendarX className="mx-auto size-8 mb-3 opacity-50" />
        No events match your current search and filters.
      </div>
    )
  }

  const groups = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const key = dateKey(item.start)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return (
    <div className="border border-border/70 rounded-xl bg-card divide-y divide-border/60 overflow-hidden">
      {Array.from(groups.entries()).map(([key, dayItems]) => (
        <div key={key} className="p-4 sm:p-5">
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {format(dayItems[0].start, "MMMM d, yyyy")}
          </h4>
          <div className="space-y-2">
            {dayItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onEventClick(item)}
                className="w-full flex items-center gap-4 rounded-lg border border-border/60 p-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <span className={cn("size-2.5 rounded-full shrink-0", item.kind === "event" ? item.colors.dot : "bg-muted-foreground")} />
                <div className="w-20 shrink-0 text-sm text-muted-foreground">{item.allDay ? "All day" : format(item.start, "h:mm a")}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.kind === "event" && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.raw.venueName ?? "No venue set"}
                    </p>
                  )}
                  {item.kind === "imported" && <p className="text-xs text-muted-foreground">Imported</p>}
                </div>
                {item.kind === "event" && (
                  <span className={cn("shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border", BOOKING_STATUS_STYLE[item.bookingStatus])}>
                    {BOOKING_STATUS_LABEL[item.bookingStatus]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
