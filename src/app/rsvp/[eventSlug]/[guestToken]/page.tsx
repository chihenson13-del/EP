import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { resolveTheme, fontPairStyle } from "@/lib/theme-resolve"
import { RsvpForm } from "@/components/public/rsvp-form"
import { MusicPlayer } from "@/components/public/music-player"

export default async function GuestRsvpPage({ params }: { params: Promise<{ eventSlug: string; guestToken: string }> }) {
  const { eventSlug, guestToken } = await params

  const event = await db.event.findUnique({
    where: { slug: eventSlug },
    include: { page: { include: { theme: true } }, customQuestions: { orderBy: { order: "asc" } } },
  })
  if (!event) notFound()

  const guest = await db.guest.findFirst({
    where: { eventId: event.id, rsvpToken: guestToken },
    include: { plusOnes: true, answers: true },
  })
  if (!guest) notFound()

  const theme = resolveTheme(event.page?.theme?.config, event.page?.colors, event.page?.fonts)
  const deadlinePassed = !!(event.rsvpDeadline && new Date() > event.rsvpDeadline && !event.allowLateRsvp)
  const fontStyle = fontPairStyle(theme.fontPair)

  return (
    <div
      style={{ backgroundColor: theme.background, color: theme.primary, ...fontStyle.style }}
      className={`min-h-screen py-12 px-4 font-sans ${fontStyle.className}`}
    >
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.2em] text-xs opacity-70 mb-2">You&apos;re invited</p>
          <h1 className="font-heading text-3xl font-bold">{event.name}</h1>
          {event.date && (
            <p className="mt-2 text-sm opacity-70">
              {new Date(event.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {event.timeLabel ? ` · ${event.timeLabel}` : ""}
              {event.venueName ? ` · ${event.venueName}` : ""}
            </p>
          )}
        </div>

        <RsvpForm
          theme={theme}
          deadlinePassed={deadlinePassed}
          allowMaybe={event.allowMaybe}
          questions={JSON.parse(JSON.stringify(event.customQuestions))}
          guest={JSON.parse(JSON.stringify(guest))}
        />
      </div>
      {event.musicEnabled && event.musicYoutubeVideoId && (
        <MusicPlayer
          config={{
            videoId: event.musicYoutubeVideoId,
            title: event.musicTitle,
            autoplay: event.musicAutoplay,
            startMuted: event.musicStartMuted,
            loop: event.musicLoop,
            volume: event.musicVolume,
            showControl: event.musicShowControl,
            showPlayer: event.musicShowPlayer,
          }}
        />
      )}
    </div>
  )
}
