import { z } from "zod"

export const submitPurchaseSchema = z.object({
  planKey: z.enum(["PREMIUM", "PRO", "UNLIMITED"]),
  eventId: z.string().optional(),
  paymentReference: z.string().trim().min(1, "Enter your payment/transaction reference").max(120),
  paymentMethod: z.string().trim().min(1, "Select a payment method").max(60),
  proofImageUrl: z.string().trim().max(1000).optional().or(z.literal("")),
})
export type SubmitPurchaseInput = z.infer<typeof submitPurchaseSchema>

export const grantEntitlementSchema = z.object({
  userId: z.string(),
  planKey: z.enum(["PREMIUM", "PRO", "UNLIMITED"]),
  eventId: z.string().optional(),
  reason: z.string().trim().min(3, "A reason is required for manual grants").max(500),
})
export type GrantEntitlementInput = z.infer<typeof grantEntitlementSchema>
