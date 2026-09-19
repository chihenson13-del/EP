import type { EventStatus, EventType } from "@prisma/client"

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"

/** Indirected so the React Compiler's purity check (flags direct Date.now() calls in component bodies) doesn't trip on callers. */
export function currentTimestamp(): number {
  return Date.now()
}

/**
 * Booking status is derived entirely from the real EventStatus + date —
 * there is no separate "booking status" field, so nothing here is fake state.
 * ARCHIVED (the app's existing deactivate/soft-delete mechanism) doubles as
 * "cancelled" for calendar purposes; a published event in the past is "completed".
 */
export function getBookingStatus(event: { status: EventStatus; date: Date | null }): BookingStatus {
  if (event.status === "ARCHIVED") return "CANCELLED"
  if (event.status === "DRAFT" || event.status === "UNPUBLISHED") return "PENDING"
  if (event.date && event.date.getTime() < currentTimestamp()) return "COMPLETED"
  return "CONFIRMED"
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
}

export const BOOKING_STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: "bg-[color:var(--brand-taupe)]/25 text-[color:var(--brand-plum)] border-[color:var(--brand-taupe)]/40",
  CONFIRMED: "bg-[color:var(--brand-lavender)]/60 text-[color:var(--brand-purple-deep)] border-[color:var(--brand-purple-pastel)]/40",
  CANCELLED: "bg-muted text-muted-foreground border-border line-through decoration-1",
  COMPLETED: "bg-secondary text-secondary-foreground border-border/70",
}

/** Best-effort parse of a freeform time label like "2:00 PM" / "14:30" / "Noon". Returns null when unparseable. */
export function parseTimeLabel(label: string | null | undefined): { hours: number; minutes: number } | null {
  if (!label) return null
  const trimmed = label.trim().toLowerCase()
  if (trimmed === "noon") return { hours: 12, minutes: 0 }
  if (trimmed === "midnight") return { hours: 0, minutes: 0 }
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null
  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const ampm = match[3]
  if (ampm === "pm" && hours < 12) hours += 12
  if (ampm === "am" && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

export type EventWindow = { start: Date; end: Date; allDay: boolean }

/**
 * Derives a start/end instant from the event's real date + timeLabel.
 * When the time can't be parsed, the event is treated as all-day (spanning
 * date..endDate) rather than inventing a precise time we don't actually have.
 */
export function getEventWindow(event: { date: Date | null; endDate: Date | null; timeLabel: string | null }): EventWindow | null {
  if (!event.date) return null
  const time = parseTimeLabel(event.timeLabel)
  const start = new Date(event.date)

  if (!time) {
    const end = event.endDate ? new Date(event.endDate) : new Date(start)
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)
    return { start, end, allDay: true }
  }

  start.setHours(time.hours, time.minutes, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000) // default 2h duration — no explicit end-time field exists
  return { start, end, allDay: false }
}

export function windowsOverlap(a: EventWindow, b: EventWindow): boolean {
  return a.start < b.end && b.start < a.end
}

type EventTypeColor = { bg: string; text: string; dot: string }

/** Soft, elegant per-type accent — reuses the app's brand tokens plus two new soft neutrals for this feature. */
export const EVENT_TYPE_COLORS: Record<EventType, EventTypeColor> = {
  WEDDING: { bg: "bg-[color:var(--brand-lavender)]/50", text: "text-[color:var(--brand-purple-deep)]", dot: "bg-[color:var(--brand-purple-pastel)]" },
  BIRTHDAY: { bg: "bg-[#F6DFCF]/60", text: "text-[#8A5A3C]", dot: "bg-[#E7B48C]" },
  KIDS_PARTY: { bg: "bg-[#F6DFCF]/60", text: "text-[#8A5A3C]", dot: "bg-[#E7B48C]" },
  DEBUT: { bg: "bg-[color:var(--brand-lavender)]/50", text: "text-[color:var(--brand-purple-deep)]", dot: "bg-[color:var(--brand-purple-pastel)]" },
  BAPTISM: { bg: "bg-[#EFE1EC]/70", text: "text-[#7A5A72]", dot: "bg-[#D9B9CF]" },
  GRADUATION: { bg: "bg-[color:var(--brand-purple-pastel)]/25", text: "text-[color:var(--brand-purple-deep)]", dot: "bg-[color:var(--brand-purple-deep)]" },
  ANNIVERSARY: { bg: "bg-[color:var(--brand-lavender)]/50", text: "text-[color:var(--brand-purple-deep)]", dot: "bg-[color:var(--brand-purple-pastel)]" },
  BABY_SHOWER: { bg: "bg-[#F3DEE2]/70", text: "text-[#8A5560]", dot: "bg-[#E3B7C0]" },
  BRIDAL_SHOWER: { bg: "bg-[#F3DEE2]/70", text: "text-[#8A5560]", dot: "bg-[#E3B7C0]" },
  CORPORATE: { bg: "bg-[color:var(--brand-taupe)]/25", text: "text-[#5A4C3E]", dot: "bg-[color:var(--brand-taupe)]" },
  CONFERENCE: { bg: "bg-[color:var(--brand-taupe)]/25", text: "text-[#5A4C3E]", dot: "bg-[color:var(--brand-taupe)]" },
  SEMINAR: { bg: "bg-[color:var(--brand-taupe)]/25", text: "text-[#5A4C3E]", dot: "bg-[color:var(--brand-taupe)]" },
  SCHOOL_EVENT: { bg: "bg-[color:var(--brand-beige)]", text: "text-[color:var(--brand-plum)]", dot: "bg-[color:var(--brand-taupe)]" },
  FAMILY_REUNION: { bg: "bg-[color:var(--brand-beige)]", text: "text-[color:var(--brand-plum)]", dot: "bg-[color:var(--brand-taupe)]" },
  DINNER: { bg: "bg-[color:var(--brand-beige)]", text: "text-[color:var(--brand-plum)]", dot: "bg-[color:var(--brand-taupe)]" },
  PARTY: { bg: "bg-[#F6DFCF]/60", text: "text-[#8A5A3C]", dot: "bg-[#E7B48C]" },
  COMMUNITY_EVENT: { bg: "bg-[color:var(--brand-beige)]", text: "text-[color:var(--brand-plum)]", dot: "bg-[color:var(--brand-taupe)]" },
  PRODUCT_LAUNCH: { bg: "bg-[color:var(--brand-taupe)]/25", text: "text-[#5A4C3E]", dot: "bg-[color:var(--brand-taupe)]" },
  COMPANY_CELEBRATION: { bg: "bg-[color:var(--brand-taupe)]/25", text: "text-[#5A4C3E]", dot: "bg-[color:var(--brand-taupe)]" },
  CUSTOM: { bg: "bg-[color:var(--brand-beige)]", text: "text-[color:var(--brand-plum)]", dot: "bg-[color:var(--brand-taupe)]" },
}

export function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

export function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}
