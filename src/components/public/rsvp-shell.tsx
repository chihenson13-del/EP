import Link from "next/link"
import { CalendarDays, Clock, MapPin } from "lucide-react"
import { formatDate } from "@/lib/timezone"
import { resolveTheme, themeStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { MusicPlayer } from "@/components/public/music-player"
import type { RsvpEvent } from "@/lib/rsvp-page-data"
import { isRsvpClosed } from "@/lib/rsvp-settings"
import type { RsvpEventSummary } from "@/components/public/rsvp-form"

export function rsvpTheme(event: RsvpEvent): ResolvedTheme {
  const layout = (event.page?.layout ?? null) as { themeKey?: string } | null
  return resolveTheme({ themeKey: layout?.themeKey, legacyThemeKey: event.page?.theme?.key, colors: event.page?.colors, fonts: event.page?.fonts })
}

export function rsvpSummary(event: RsvpEvent): RsvpEventSummary {
  return {
    name: event.name,
    dateLabel: event.date ? `${formatDate(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${event.timeLabel ? ` · ${event.timeLabel}` : ""}` : null,
    venueName: event.venueName,
    address: event.address,
  }
}

export function isDeadlinePassed(event: RsvpEvent): boolean {
  return isRsvpClosed(event)
}

/**
 * The themed frame around every RSVP screen: "RSVP to this event", the event's name, date, time and venue,
 * the host's optional message and the deadline. Mobile-first: one column, fluid type, nothing wider than the screen.
 */
export function RsvpShell({ event, theme, intro, children }: { event: RsvpEvent; theme: ResolvedTheme; intro: string; children: React.ReactNode }) {
  return (
    <div style={themeStyle(theme)} className={`min-h-dvh w-full overflow-x-clip px-4 pt-10 sm:pt-14 ${event.musicEnabled && event.musicYoutubeVideoId && event.musicShowControl ? "pb-24" : "pb-10 sm:pb-14"}`}>
      <main className="mx-auto w-full max-w-lg space-y-6">
        {event.previewOnly && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Preview: this event isn&apos;t published yet, so only you and your team can open this page.
          </p>
        )}
        <header className="text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: theme.colors.accent }}>RSVP to this event</p>
          <h1 className="text-[clamp(1.9rem,8vw,2.75rem)] font-bold leading-tight break-words" style={{ fontFamily: "var(--font-title)", color: theme.colors.primary }}>
            {event.name}
          </h1>
          <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5 text-sm" style={{ color: theme.colors.text }}>
            {event.date && (
              <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0" style={{ color: theme.colors.accent }} aria-hidden />
                {formatDate(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            )}
            {event.timeLabel && <p className="flex items-center gap-2"><Clock className="size-4 shrink-0" style={{ color: theme.colors.accent }} aria-hidden />{event.timeLabel}</p>}
            {event.venueName && (
              <p className="flex items-start gap-2 text-center"><MapPin className="size-4 shrink-0 mt-0.5" style={{ color: theme.colors.accent }} aria-hidden />
                <span className="break-words">{event.venueName}{event.address ? <span className="block opacity-75">{event.address}</span> : null}</span></p>
            )}
          </div>
          {intro && <p className="mx-auto max-w-md whitespace-pre-line break-words opacity-90">{intro}</p>}
          {event.rsvpDeadline && (
            <p className="text-xs font-medium" style={{ color: theme.colors.secondary }}>Please respond by {formatDate(event.rsvpDeadline, { month: "long", day: "numeric", year: "numeric" })}</p>
          )}
        </header>
        {children}
        <p className="text-center text-xs">
          <Link href={`/e/${event.slug}`} className="underline underline-offset-4 opacity-75 hover:opacity-100">Back to the invitation</Link>
        </p>
      </main>
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
