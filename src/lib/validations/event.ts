import { z } from "zod"

export const eventTypeValues = [
  "BIRTHDAY", "KIDS_PARTY", "WEDDING", "DEBUT", "BAPTISM", "GRADUATION",
  "ANNIVERSARY", "BABY_SHOWER", "BRIDAL_SHOWER", "CORPORATE", "CONFERENCE",
  "SEMINAR", "SCHOOL_EVENT", "FAMILY_REUNION", "DINNER", "PARTY",
  "COMMUNITY_EVENT", "PRODUCT_LAUNCH", "COMPANY_CELEBRATION", "CUSTOM",
] as const

export const createEventSchema = z.object({
  name: z.string().trim().min(2, "Give your event a name").max(120),
  type: z.enum(eventTypeValues),
  date: z.string().optional().or(z.literal("")),
  timeLabel: z.string().trim().max(40).optional().or(z.literal("")),
  venueName: z.string().trim().max(160).optional().or(z.literal("")),
})
export type CreateEventInput = z.infer<typeof createEventSchema>

export const updateEventSchema = z.object({
  eventId: z.string(),
  name: z.string().trim().min(2).max(120),
  type: z.enum(eventTypeValues),
  customTypeLabel: z.string().trim().max(60).optional().or(z.literal("")),
  hostName: z.string().trim().max(120).optional().or(z.literal("")),
  date: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  timeLabel: z.string().trim().max(40).optional().or(z.literal("")),
  timezone: z.string().trim().max(60).optional().or(z.literal("")),
  venueName: z.string().trim().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  mapUrl: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  rsvpDeadline: z.string().optional().or(z.literal("")),
  allowLateRsvp: z.boolean().optional(),
  allowMaybe: z.boolean().optional(),
  personalizedRsvpOnly: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  guestListVisible: z.boolean().optional(),
  rsvpVisible: z.boolean().optional(),
})
export type UpdateEventInput = z.infer<typeof updateEventSchema>
