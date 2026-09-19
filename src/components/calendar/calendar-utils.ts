import { getEventWindow, getBookingStatus, EVENT_TYPE_COLORS, type BookingStatus } from "@/lib/booking-calendar"
import type { CalendarEvent, ImportedEvent } from "./types"

export type PositionedEvent = {
  id: string
  kind: "event"
  raw: CalendarEvent
  start: Date
  end: Date
  allDay: boolean
  bookingStatus: BookingStatus
  colors: { bg: string; text: string; dot: string }
  title: string
}

export type PositionedImported = {
  id: string
  kind: "imported"
  raw: ImportedEvent
  start: Date
  end: Date
  allDay: boolean
  title: string
}

export type CalendarItem = PositionedEvent | PositionedImported

export function buildCalendarItems(events: CalendarEvent[], imported: ImportedEvent[]): CalendarItem[] {
  const items: CalendarItem[] = []

  for (const e of events) {
    const window = getEventWindow({ date: e.date ? new Date(e.date) : null, endDate: e.endDate ? new Date(e.endDate) : null, timeLabel: e.timeLabel })
    if (!window) continue
    items.push({
      id: e.id,
      kind: "event",
      raw: e,
      start: window.start,
      end: window.end,
      allDay: window.allDay,
      bookingStatus: getBookingStatus({ status: e.status, date: e.date ? new Date(e.date) : null }),
      colors: EVENT_TYPE_COLORS[e.type],
      title: e.name,
    })
  }

  for (const i of imported) {
    items.push({
      id: i.id,
      kind: "imported",
      raw: i,
      start: new Date(i.startAt),
      end: i.endAt ? new Date(i.endAt) : new Date(new Date(i.startAt).getTime() + 60 * 60 * 1000),
      allDay: i.allDay,
      title: i.title,
    })
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function itemTouchesDay(item: CalendarItem, day: Date): boolean {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(23, 59, 59, 999)
  return item.start <= dayEnd && item.end >= dayStart
}

export const HOUR_RANGE = { start: 6, end: 23 } // 6 AM – 11 PM timeline window
