import { z } from "zod"

export const rsvpSubmitSchema = z.object({
  guestId: z.string(),
  rsvpToken: z.string(),
  rsvpStatus: z.enum(["ATTENDING", "DECLINED", "MAYBE"]),
  numberAttending: z.coerce.number().int().min(0).max(21).optional(),
  plusOneNames: z.array(z.string().trim().max(80)).optional(),
  mealPreference: z.string().trim().max(120).optional().or(z.literal("")),
  dietaryRestrictions: z.string().trim().max(240).optional().or(z.literal("")),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()])).optional(),
})
export type RsvpSubmitInput = z.infer<typeof rsvpSubmitSchema>
