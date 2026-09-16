"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { extractYoutubeVideoId } from "@/lib/youtube"
import { musicSettingsSchema, type MusicSettingsInput } from "@/lib/validations/music"
import type { ActionResult } from "@/actions/events"

export async function updateEventMusic(input: MusicSettingsInput): Promise<ActionResult<{ videoId: string | null }>> {
  const user = await requireUser()
  const parsed = musicSettingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const d = parsed.data

  await requireEventAccess(user.id, d.eventId).catch(() => { throw new Error("NO_ACCESS") })

  let videoId: string | null = null
  if (d.musicEnabled) {
    if (!d.youtubeUrl?.trim()) {
      return { ok: false, error: "Add a YouTube URL before enabling music." }
    }
    videoId = extractYoutubeVideoId(d.youtubeUrl)
    if (!videoId) {
      return { ok: false, error: "Please enter a valid YouTube URL." }
    }
  } else if (d.youtubeUrl?.trim()) {
    // Music disabled but a URL was still provided (e.g. re-saving) — keep the extracted ID if it's valid.
    videoId = extractYoutubeVideoId(d.youtubeUrl)
  }

  const event = await db.event.update({
    where: { id: d.eventId },
    data: {
      musicEnabled: d.musicEnabled,
      musicYoutubeUrl: d.youtubeUrl || null,
      musicYoutubeVideoId: videoId,
      musicTitle: d.musicTitle || null,
      musicAutoplay: d.autoplay,
      musicStartMuted: d.startMuted,
      musicLoop: d.loop,
      musicVolume: d.volume,
      musicShowControl: d.showControl,
      musicShowPlayer: d.showPlayer,
    },
  })

  revalidatePath(`/dashboard/events/${d.eventId}/settings`)
  revalidatePath(`/e/${event.slug}`)
  return { ok: true, data: { videoId } }
}
