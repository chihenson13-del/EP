import type { EventStatus, EventType } from "@prisma/client"

export type CalendarEvent = {
  id: string
  name: string
  type: EventType
  customTypeLabel: string | null
  slug: string
  status: EventStatus
  date: string | null
  endDate: string | null
  timeLabel: string | null
  venueName: string | null
  address: string | null
  description: string | null
  isPublic: boolean
  createdAt: string
  guestCount: number
  attendingCount: number
  ownerName: string
  ownerEmail: string
}

export type ImportedEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  startAt: string
  endAt: string | null
  allDay: boolean
}

export type CalendarView = "month" | "week" | "day" | "agenda"

export type StatusFilter = "ALL" | "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED"
