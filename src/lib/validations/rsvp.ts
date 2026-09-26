import { z } from "zod"

export const rsvpSubmitSchema = z.object({
  guestId: z.string(),
  rsvpToken: z.string(),
  rsvpStatus: z.enum(["ATTENDING", "DECLINED", "MAYBE"]),
  /** The answer choice the guest picked (RsvpPrompt option id); decides the status server-side. */
  optionId: z.string().max(40).optional(),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  numberAttending: z.coerce.number().int().min(0).max(21).optional(),
  plusOneNames: z.array(z.string().trim().max(80)).optional(),
  mealPreference: z.string().trim().max(120).optional().or(z.literal("")),
  dietaryRestrictions: z.string().trim().max(240).optional().or(z.literal("")),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()])).optional(),
})
export type RsvpSubmitInput = z.infer<typeof rsvpSubmitSchema>

/** Same fields without the personal-link credentials (used by the name-search session flow). */
export const rsvpSessionSubmitSchema = rsvpSubmitSchema.omit({ guestId: true, rsvpToken: true })
export type RsvpSessionSubmitInput = z.infer<typeof rsvpSessionSubmitSchema>
