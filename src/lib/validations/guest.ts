import { z } from "zod"

export const guestSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  groupId: z.string().optional().or(z.literal("")),
  plusOneAllowed: z.boolean().optional(),
  maxPlusOnes: z.number().int().min(0).max(20).optional(),
  childrenCount: z.number().int().min(0).max(20).optional(),
  mealPreference: z.string().trim().max(120).optional().or(z.literal("")),
  dietaryRestrictions: z.string().trim().max(240).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
})
export type GuestInput = z.infer<typeof guestSchema>

export const customQuestionSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Question is required").max(200),
  type: z.enum(["YES_NO", "MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN", "SHORT_TEXT", "LONG_TEXT", "NUMBER"]),
  required: z.boolean().optional(),
  options: z.array(z.string().trim().min(1)).optional(),
})
export type CustomQuestionInput = z.infer<typeof customQuestionSchema>

export const importRowSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  category: z.string().trim().optional(),
})
export type ImportRow = z.infer<typeof importRowSchema>
