import { z } from "zod"
import { isSafeImageUrl, IMAGE_URL_ERROR, MAX_IMAGE_DATA_URL_LENGTH } from "@/lib/image-url"

export const submitPurchaseSchema = z.object({
  planKey: z.enum(["PREMIUM", "PRO", "UNLIMITED"]),
  eventId: z.string().optional(),
  paymentReference: z.string().trim().min(1, "Enter your payment/transaction reference").max(120),
  paymentMethod: z.string().trim().min(1, "Select a payment method").max(60),
  // proofImageUrl comes back from ImageUpload as a base64 data URL (no storage provider is
  // configured), so it must accommodate the largest file ImageUpload allows (5MB -> ~7M base64 chars).
  proofImageUrl: z
    .string()
    .trim()
    .max(MAX_IMAGE_DATA_URL_LENGTH)
    .refine((v) => v === "" || isSafeImageUrl(v), IMAGE_URL_ERROR)
    .optional(),
})
export type SubmitPurchaseInput = z.infer<typeof submitPurchaseSchema>

export const grantEntitlementSchema = z.object({
  userId: z.string(),
  planKey: z.enum(["PREMIUM", "PRO", "UNLIMITED"]),
  eventId: z.string().optional(),
  reason: z.string().trim().min(3, "A reason is required for manual grants").max(500),
})
export type GrantEntitlementInput = z.infer<typeof grantEntitlementSchema>
