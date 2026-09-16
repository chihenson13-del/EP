import { z } from "zod"

export const musicSettingsSchema = z.object({
  eventId: z.string(),
  musicEnabled: z.boolean(),
  youtubeUrl: z.string().trim().max(500).optional().or(z.literal("")),
  musicTitle: z.string().trim().max(120).optional().or(z.literal("")),
  autoplay: z.boolean(),
  startMuted: z.boolean(),
  loop: z.boolean(),
  volume: z.coerce.number().int().min(0).max(100),
  showControl: z.boolean(),
  showPlayer: z.boolean(),
})
export type MusicSettingsInput = z.infer<typeof musicSettingsSchema>
