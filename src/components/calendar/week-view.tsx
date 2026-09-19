"use client"

import { startOfWeek, addDays, format, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { itemTouchesDay, HOUR_RANGE, type CalendarItem } from "./calendar-utils"

const HOURS = Array.from({ length: HOUR_RANGE.end - HOUR_RANGE.start + 1 }, (_, i) => HOUR_RANGE.start + i)
const ROW_HEIGHT = 56

export function WeekView({
  anchorDate, items, onEventClick, onDateClick,
}: {
  anchorDate: Date
  items: CalendarItem[]
  onEventClick: (item: CalendarItem) => void
  onDateClick: (date: Date) => void
}) {
  const weekStart = startOfWeek(anchorDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/70 bg-secondary/40">
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="py-2.5 text-center border-l border-border/50">
            <div className="text-xs font-medium text-muted-foreground uppercase">{format(day, "EEE")}</div>
            <div className={cn("mx-auto mt-0.5 size-6 flex items-center justify-center rounded-full text-sm font-medium", isToday(day) && "bg-primary text-primary-foreground")}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: ROW_HEIGHT }} className="text-[11px] text-muted-foreground text-right pr-2 -translate-y-2 border-t border-border/40">
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </div>
            ))}
          </div>
          {days.map((day) => {
            const dayItems = items.filter((it) => itemTouchesDay(it, day) && !it.allDay)
            const allDayItems = items.filter((it) => itemTouchesDay(it, day) && it.allDay)
            return (
              <div key={day.toISOString()} className="relative border-l border-border/50" onClick={() => onDateClick(day)}>
                {HOURS.map((h) => (
                  <div key={h} style={{ height: ROW_HEIGHT }} className="border-t border-border/40 hover:bg-secondary/20 cursor-pointer" />
                ))}
                {allDayItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(item) }}
                    style={{ top: idx * 20 }}
                    className={cn(
                      "absolute left-0.5 right-0.5 text-[10px] px-1 py-0.5 rounded truncate font-medium z-10",
                      item.kind === "event" ? `${item.colors.bg} ${item.colors.text}` : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.map((item) => {
                  const startHour = item.start.getHours() + item.start.getMinutes() / 60
                  const endHour = item.end.getHours() + item.end.getMinutes() / 60
                  const top = Math.max(0, (startHour - HOUR_RANGE.start)) * ROW_HEIGHT
                  const height = Math.max(24, (endHour - startHour) * ROW_HEIGHT)
                  return (
                    <button
                      key={item.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(item) }}
                      style={{ top: top + allDayItems.length * 20, height }}
                      className={cn(
                        "absolute left-0.5 right-0.5 text-left text-[11px] px-1.5 py-1 rounded-md truncate font-medium overflow-hidden z-10 shadow-sm",
                        item.kind === "event" ? `${item.colors.bg} ${item.colors.text}` : "bg-muted text-muted-foreground border border-dashed border-border"
                      )}
                    >
                      {item.title}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
