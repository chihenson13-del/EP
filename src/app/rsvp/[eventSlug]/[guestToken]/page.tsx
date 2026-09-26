import { formatDate } from "@/lib/timezone"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { resolveTheme, themeStyle } from "@/lib/theme-resolve"
import { readRsvpPrompt, visibleRsvpOptions } from "@/lib/rsvp-prompt"
import { RsvpForm } from "@/components/public/rsvp-form"
import { MusicPlayer } from "@/components/public/music-player"

export default async function GuestRsvpPage({ params }: { params: Promise<{ eventSlug: string; guestToken: string }> }) {
  const { eventSlug, guestToken } = await params

  // One query: the token is unique, and the event must match the slug in the URL.
  const found = await db.guest.findFirst({
    relationLoadStrategy: "join",
    where: { rsvpToken: guestToken, event: { slug: eventSlug } },
    include: {
      plusOnes: true,
      answers: true,
      event: { include: { page: { include: { theme: true } }, customQuestions: { orderBy: { order: "asc" } } } },
    },
  })
  if (!found) notFound()
  const { event, ...guest } = found

  const layout = (event.page?.layout ?? null) as { themeKey?: string } | null
  const theme = resolveTheme({ themeKey: layout?.themeKey, legacyThemeKey: event.page?.theme?.key, colors: event.page?.colors, fonts: event.page?.fonts })
  const prompt = readRsvpPrompt(event.page?.layout)
  const deadlinePassed = !!(event.rsvpDeadline && new Date() > event.rsvpDeadline && !event.allowLateRsvp)

  return (
    <div style={themeStyle(theme)} className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.2em] text-xs opacity-70 mb-2">You&apos;re invited</p>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-title)", color: theme.colors.primary }}>{event.name}</h1>
          {event.date && (
            <p className="mt-2 text-sm opacity-70">
              {formatDate(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {event.timeLabel ? ` · ${event.timeLabel}` : ""}
              {event.venueName ? ` · ${event.venueName}` : ""}
            </p>
          )}
        </div>

        <RsvpForm
          theme={theme}
          deadlinePassed={deadlinePassed}
          question={prompt.question}
          options={visibleRsvpOptions(prompt, event.allowMaybe)}
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
