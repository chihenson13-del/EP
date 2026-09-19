"use client"

import { format } from "date-fns"
import { MapPin, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { itemTouchesDay, HOUR_RANGE, type CalendarItem } from "./calendar-utils"

const HOURS = Array.from({ length: HOUR_RANGE.end - HOUR_RANGE.start + 1 }, (_, i) => HOUR_RANGE.start + i)
const ROW_HEIGHT = 72

export function DayView({
  anchorDate, items, onEventClick, onDateClick,
}: {
  anchorDate: Date
  items: CalendarItem[]
  onEventClick: (item: CalendarItem) => void
  onDateClick: (date: Date) => void
}) {
  const dayItems = items.filter((it) => itemTouchesDay(it, anchorDate) && !it.allDay)
  const allDayItems = items.filter((it) => itemTouchesDay(it, anchorDate) && it.allDay)

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
      <div className="px-5 py-4 border-b border-border/70 bg-secondary/40">
        <h3 className="font-heading text-lg font-semibold">{format(anchorDate, "EEEE, MMMM d, yyyy")}</h3>
      </div>
      {allDayItems.length > 0 && (
        <div className="px-5 py-3 border-b border-border/50 flex flex-wrap gap-2">
          {allDayItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onEventClick(item)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full font-medium",
                item.kind === "event" ? `${item.colors.bg} ${item.colors.text}` : "bg-muted text-muted-foreground"
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-y-auto max-h-[650px]">
        <div className="relative grid grid-cols-[70px_1fr]">
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: ROW_HEIGHT }} className="text-xs text-muted-foreground text-right pr-3 -translate-y-2 border-t border-border/40">
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </div>
            ))}
          </div>
          <div className="relative border-l border-border/50" onClick={() => onDateClick(anchorDate)}>
            {HOURS.map((h) => (
              <div key={h} style={{ height: ROW_HEIGHT }} className="border-t border-border/40 hover:bg-secondary/20 cursor-pointer" />
            ))}
            {dayItems.map((item) => {
              const startHour = item.start.getHours() + item.start.getMinutes() / 60
              const endHour = item.end.getHours() + item.end.getMinutes() / 60
              const top = Math.max(0, startHour - HOUR_RANGE.start) * ROW_HEIGHT
              const height = Math.max(48, (endHour - startHour) * ROW_HEIGHT)
              return (
                <button
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick(item) }}
                  style={{ top, height }}
                  className={cn(
                    "absolute left-2 right-2 text-left rounded-lg px-3 py-2 overflow-hidden shadow-sm z-10",
                    item.kind === "event" ? `${item.colors.bg} ${item.colors.text}` : "bg-muted text-muted-foreground border border-dashed border-border"
                  )}
                >
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.kind === "event" && (
                    <div className="flex items-center gap-3 mt-0.5 text-xs opacity-80">
                      <span>{format(item.start, "h:mm a")}</span>
                      {item.raw.venueName && (
                        <span className="flex items-center gap-1 truncate"><MapPin className="size-3 shrink-0" /> {item.raw.venueName}</span>
                      )}
                      <span className="flex items-center gap-1 truncate"><User className="size-3 shrink-0" /> {item.raw.ownerName || "You"}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
