"use client"

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, format } from "date-fns"
import { cn } from "@/lib/utils"
import { itemTouchesDay, type CalendarItem } from "./calendar-utils"

export function MonthView({
  anchorDate, items, onEventClick, onDateClick, onShowMore,
}: {
  anchorDate: Date
  items: CalendarItem[]
  onEventClick: (item: CalendarItem) => void
  onDateClick: (date: Date) => void
  onShowMore: (date: Date) => void
}) {
  const monthStart = startOfMonth(anchorDate)
  const monthEnd = endOfMonth(anchorDate)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b border-border/70 bg-secondary/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((it) => itemTouchesDay(it, day))
          const visible = dayItems.slice(0, 3)
          const overflow = dayItems.length - visible.length
          const inMonth = isSameMonth(day, anchorDate)
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[110px] border-b border-r border-border/50 p-1.5 sm:p-2 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-secondary/30",
                !inMonth && "bg-secondary/20 text-muted-foreground/60"
              )}
              onClick={() => onDateClick(day)}
            >
              <span
                className={cn(
                  "text-xs font-medium size-6 flex items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                {visible.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(item) }}
                    className={cn(
                      "text-left text-[11px] leading-tight px-1.5 py-1 rounded-md truncate font-medium",
                      item.kind === "event" ? `${item.colors.bg} ${item.colors.text}` : "bg-muted text-muted-foreground border border-dashed border-border"
                    )}
                    title={item.title}
                  >
                    {item.kind === "imported" && <span className="opacity-70">Imported · </span>}
                    {item.title}
                  </button>
                ))}
                {overflow > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onShowMore(day) }}
                    className="text-left text-[11px] font-medium text-primary hover:underline px-1.5"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
