import { z } from "zod"

export const sendMessageSchema = z.object({
  eventId: z.string(),
  channel: z.enum(["EMAIL", "SMS"]),
  type: z.enum(["INVITATION", "REMINDER", "CUSTOM"]),
  guestIds: z.array(z.string()).min(1, "Select at least one guest"),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  body: z.string().trim().min(1, "Write a message").max(4000),
  scheduledFor: z.string().optional().or(z.literal("")),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>
