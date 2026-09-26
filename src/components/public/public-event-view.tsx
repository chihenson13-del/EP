"use client"

import { formatDate } from "@/lib/timezone"
import { useMemo } from "react"
import { Countdown } from "@/components/public/countdown"
import { googleCalendarUrl, outlookCalendarUrl, icsFileContent } from "@/lib/calendar-links"
import { safeHttpUrl } from "@/lib/image-url"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { buttonStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { RADIUS_PX } from "@/lib/themes"
import { HeroDecoration, SectionDivider } from "@/components/public/theme-decorations"
import { CalendarPlus, MapPin, ExternalLink } from "lucide-react"

type Section = { id: string; type: string; order: number; content: Record<string, unknown> }
type ScheduleItem = { id: string; time: string; title: string; description: string | null; location: string | null }
type GalleryImage = { id: string; url: string; caption: string | null }

type EventData = {
  id: string
  slug: string
  name: string
  hostName: string | null
  date: string | null
  endDate: string | null
  timeLabel: string | null
  venueName: string | null
  address: string | null
  mapUrl: string | null
  description: string | null
  coverImageUrl: string | null
  personalizedRsvpOnly: boolean
  rsvpDeadline: string | null
  rsvpQuestion: string
  sections: Section[]
  scheduleItems: ScheduleItem[]
  galleryImages: GalleryImage[]
}

/**
 * The invitation body. Every visual choice here comes from the resolved theme (colors, fonts per text role,
 * button shape, radius, decoration, section/hero/RSVP/gallery styles), so the owner's preview and the published
 * page are the same render.
 */
export function PublicEventView({ event, theme, typeLabel }: { event: EventData; theme: ResolvedTheme; typeLabel: string }) {
  const calendarLinks = useMemo(() => {
    if (!event.date) return null
    const s = new Date(event.date)
    const e = event.endDate ? new Date(event.endDate) : new Date(s.getTime() + 3 * 60 * 60 * 1000)
    const opts = { title: event.name, description: event.description ?? undefined, location: event.venueName ?? undefined, start: s, end: e }
    return {
      google: googleCalendarUrl(opts),
      outlook: outlookCalendarUrl(opts),
      ics: icsFileContent({ ...opts, uid: `${event.id}@eventspartner.app` }),
    }
  }, [event.date, event.endDate, event.name, event.description, event.venueName, event.id])

  function downloadIcs() {
    if (!calendarLinks) return
    const blob = new Blob([calendarLinks.ics], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${event.slug}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  let bodyIndex = 0
  return (
    <div>
      {event.sections.map((section) => {
        const index = section.type === "HERO" || section.type === "FOOTER" ? -1 : bodyIndex++
        return (
          <SectionRenderer key={section.id} section={section} index={index} event={event} theme={theme} typeLabel={typeLabel} calendarLinks={calendarLinks} onDownloadIcs={downloadIcs} />
        )
      })}
    </div>
  )
}

function SectionRenderer({
  section, index, event, theme, typeLabel, calendarLinks, onDownloadIcs,
}: {
  section: Section
  index: number
  event: EventData
  theme: ResolvedTheme
  typeLabel: string
  calendarLinks: { google: string; outlook: string; ics: string } | null
  onDownloadIcs: () => void
}) {
  const content = section.content as Record<string, string | undefined>
  const shell = (title: string, children: React.ReactNode) => <SectionShell title={title} theme={theme} index={index}>{children}</SectionShell>
  const btn = buttonStyle(theme)

  switch (section.type) {
    case "HERO":
      return <Hero theme={theme} typeLabel={typeLabel} heading={content.heading || event.name} subheading={content.subheading} date={event.date} timeLabel={event.timeLabel} />
    case "HOST":
      return (content.text || event.hostName) ? shell("Hosted by", <p className="text-center opacity-85">{content.text || event.hostName}</p>) : null
    case "COUNTDOWN":
      return event.date ? shell("Counting down", <Countdown target={event.date} />) : null
    case "VENUE":
      return (event.venueName || event.address) ? shell("Venue", (
        <div className="text-center space-y-3" style={{ fontFamily: "var(--font-venue)" }}>
          <p className="flex items-center justify-center gap-1.5 font-medium text-lg"><MapPin className="size-4" style={{ color: theme.colors.accent }} /> {event.venueName}</p>
          {event.address && <p className="opacity-75 text-sm">{event.address}</p>}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {safeHttpUrl(event.mapUrl) && (
              <a className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium" style={btn} href={safeHttpUrl(event.mapUrl)!} target="_blank" rel="noreferrer">Get directions <ExternalLink className="size-3.5" /></a>
            )}
            {calendarLinks && (
              <>
                <a className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium" style={btn} href={calendarLinks.google} target="_blank" rel="noreferrer"><CalendarPlus className="size-3.5" /> Google</a>
                <a className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium" style={btn} href={calendarLinks.outlook} target="_blank" rel="noreferrer"><CalendarPlus className="size-3.5" /> Outlook</a>
                <button type="button" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer" style={btn} onClick={onDownloadIcs}><CalendarPlus className="size-3.5" /> Apple / .ics</button>
              </>
            )}
          </div>
        </div>
      ))
      : null
    case "DESCRIPTION":
      return (content.text || event.description) ? shell("About this event", <p className="text-center opacity-85 whitespace-pre-line max-w-2xl mx-auto leading-relaxed">{content.text || event.description}</p>) : null
    case "SCHEDULE":
      return event.scheduleItems.length ? shell("Schedule", (
        <div className="max-w-md mx-auto space-y-4" style={{ fontFamily: "var(--font-schedule)" }}>
          {event.scheduleItems.map((s) => (
            <div key={s.id} className="flex gap-4 border-l-2 pl-4" style={{ borderColor: theme.colors.accent }}>
              <div className="font-semibold w-20 shrink-0" style={{ color: theme.colors.primary }}>{s.time}</div>
              <div>
                <p className="font-medium">{s.title}</p>
                {s.description && <p className="text-sm opacity-75">{s.description}</p>}
                {s.location && <p className="text-xs opacity-60">{s.location}</p>}
              </div>
            </div>
          ))}
        </div>
      )) : null
    case "GALLERY":
      return event.galleryImages.length ? shell("Gallery", <Gallery images={event.galleryImages} theme={theme} />) : null
    case "RSVP":
      return shell("RSVP", <RsvpBlock event={event} theme={theme} />)
    case "FAQ": {
      const items = (section.content.items as Array<{ q: string; a: string }> | undefined) ?? []
      return items.length ? shell("FAQ", (
        <Accordion type="single" collapsible className="max-w-xl mx-auto">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} style={{ borderColor: theme.colors.border }}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )) : null
    }
    case "DRESS_CODE":
      return content.text ? shell("Dress code", <p className="text-center opacity-85">{content.text}</p>) : null
    case "GIFT_INFO":
      return content.text ? shell("Gifts", <p className="text-center opacity-85">{content.text}</p>) : null
    case "CUSTOM":
      return content.text ? shell(content.heading || "More info", <p className="text-center opacity-85 whitespace-pre-line">{content.text}</p>) : null
    case "FOOTER":
      return (
        <footer className="text-center py-10 text-sm opacity-70 border-t" style={{ borderColor: theme.colors.border }}>
          <SectionDivider divider={theme.divider} />
          {content.text || `See you there! — ${event.name}`}
        </footer>
      )
    default:
      return null
  }
}

function Hero({ theme, typeLabel, heading, subheading, date, timeLabel }: { theme: ResolvedTheme; typeLabel: string; heading: string; subheading?: string; date: string | null; timeLabel: string | null }) {
  const banner = theme.hero === "banner"
  const color = banner ? theme.colors.accentText : theme.colors.primary
  const background =
    banner ? theme.colors.accent
      : theme.hero === "gradient" ? `linear-gradient(180deg, color-mix(in oklab, ${theme.colors.accent}, transparent 84%), transparent)`
        : "transparent"
  const titleSize = theme.titleStyle === "script" ? "text-5xl sm:text-7xl" : theme.titleStyle === "bold" ? "text-5xl sm:text-7xl font-extrabold uppercase tracking-tight" : "text-4xl sm:text-6xl font-bold"

  const inner = (
    <>
      <p className="uppercase tracking-[0.25em] text-xs mb-4" style={{ opacity: 0.8 }}>{typeLabel}</p>
      <h1 className={`${titleSize} mb-4 text-balance leading-tight`} style={{ fontFamily: "var(--font-title)", color }}>{heading}</h1>
      {subheading && <p className="text-lg" style={{ opacity: 0.85 }}>{subheading}</p>}
      {date && (
        <p className="mt-4 text-sm" style={{ opacity: 0.8 }}>
          {formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          {timeLabel ? ` · ${timeLabel}` : ""}
        </p>
      )}
    </>
  )

  return (
    <section className="relative overflow-hidden text-center py-20 sm:py-24 px-6" style={{ background, color: banner ? theme.colors.accentText : undefined }}>
      <div style={{ color: banner ? theme.colors.accentText : theme.colors.accent }}><HeroDecoration decoration={theme.decoration} /></div>
      <div className="relative">
        {theme.hero === "framed" ? (
          <div className="mx-auto max-w-2xl border px-6 py-12 sm:px-12" style={{ borderColor: theme.colors.accent, outline: `1px solid ${theme.colors.border}`, outlineOffset: 6, borderRadius: RADIUS_PX[theme.radius], background: theme.colors.surface }}>{inner}</div>
        ) : theme.hero === "arch" ? (
          <div className="mx-auto max-w-xl px-6 pt-16 pb-12 sm:px-12" style={{ borderRadius: "999px 999px 24px 24px", background: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>{inner}</div>
        ) : inner}
      </div>
      <div className="relative mt-8"><SectionDivider divider={theme.divider} /></div>
    </section>
  )
}

function SectionShell({ title, theme, index, children }: { title: string; theme: ResolvedTheme; index: number; children: React.ReactNode }) {
  const radius = RADIUS_PX[theme.radius]
  const alternate = theme.sections === "alternating" && index % 2 === 1
  const boxed = theme.sections === "cards" || theme.sections === "bordered" || theme.sections === "framed"
  const boxStyle: React.CSSProperties | undefined = !boxed ? undefined
    : theme.sections === "cards" ? { background: theme.colors.surface, borderRadius: radius, border: `1px solid ${theme.colors.border}`, boxShadow: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.08)" }
      : theme.sections === "bordered" ? { borderRadius: radius, border: `1px solid ${theme.colors.border}` }
        : { borderRadius: radius, border: `1px solid ${theme.colors.accent}`, outline: `1px solid ${theme.colors.border}`, outlineOffset: 5, background: theme.colors.surface }

  return (
    <section className={boxed ? "px-4 py-6 sm:py-8" : "py-14 px-6"} style={alternate ? { background: theme.colors.surface } : undefined}>
      <div className={boxed ? "mx-auto max-w-3xl px-6 py-10 sm:px-10" : alternate ? "py-2" : undefined} style={boxStyle}>
        <SectionTitle title={title} theme={theme} />
        {children}
      </div>
    </section>
  )
}

function SectionTitle({ title, theme }: { title: string; theme: ResolvedTheme }) {
  const style: React.CSSProperties = { fontFamily: "var(--font-heading)", color: theme.colors.primary }
  switch (theme.titleStyle) {
    case "spaced":
      return <h2 className="text-center mb-8 text-sm sm:text-base font-semibold uppercase tracking-[0.35em]" style={{ ...style, color: theme.colors.accent }}>{title}</h2>
    case "script":
      return <h2 className="text-center mb-8 text-4xl" style={{ ...style, fontFamily: "var(--font-title)", color: theme.colors.accent }}>{title}</h2>
    case "underline":
      return <h2 className="text-center mb-8 text-2xl font-semibold underline decoration-2 underline-offset-8" style={{ ...style, textDecorationColor: theme.colors.accent }}>{title}</h2>
    case "bold":
      return <h2 className="text-center mb-8 text-3xl font-extrabold uppercase tracking-tight" style={style}>{title}</h2>
    default:
      return <h2 className="text-center mb-8 text-2xl sm:text-3xl font-bold" style={{ ...style, color: theme.colors.accent }}>{title}</h2>
  }
}

function Gallery({ images, theme }: { images: GalleryImage[]; theme: ResolvedTheme }) {
  const radius = RADIUS_PX[theme.radius]
  return (
    <div className={`grid ${theme.gallery === "polaroid" ? "grid-cols-2 sm:grid-cols-3 gap-5" : "grid-cols-2 sm:grid-cols-3 gap-3"} max-w-3xl mx-auto`}>
      {images.map((g, i) => {
        // eslint-disable-next-line @next/next/no-img-element
        const img = <img src={g.url} alt={g.caption ?? ""} loading="lazy" decoding="async" className="w-full aspect-square object-cover" style={
          theme.gallery === "rounded" ? { borderRadius: Math.max(radius, 8) }
            : theme.gallery === "arch" ? { borderRadius: "999px 999px 12px 12px", aspectRatio: "3 / 4" }
              : theme.gallery === "circle" ? { borderRadius: "999px" }
                : undefined
        } />
        if (theme.gallery === "polaroid") {
          return (
            <figure key={g.id} className="bg-white p-2 pb-6 shadow-md" style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
              {img}
              {g.caption && <figcaption className="mt-2 text-center text-xs text-neutral-600" style={{ fontFamily: "var(--font-title)" }}>{g.caption}</figcaption>}
            </figure>
          )
        }
        return <div key={g.id}>{img}</div>
      })}
    </div>
  )
}

function RsvpBlock({ event, theme }: { event: EventData; theme: ResolvedTheme }) {
  const radius = RADIUS_PX[theme.radius]
  const style: React.CSSProperties =
    theme.rsvp === "filled" ? { background: theme.colors.accent, color: theme.colors.accentText, borderRadius: radius }
      : theme.rsvp === "outlined" ? { border: `1.5px solid ${theme.colors.accent}`, borderRadius: radius }
        : { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: radius }
  return (
    <div className="mx-auto max-w-lg px-6 py-8 text-center space-y-3" style={{ ...style, fontFamily: "var(--font-rsvp)" }}>
      <p className="text-xl font-semibold">{event.rsvpQuestion}</p>
      <p className="opacity-85 text-sm">
        {event.personalizedRsvpOnly
          ? "Please use the personal RSVP link sent to your email or phone to respond."
          : "We'd love to know if you can make it."}
      </p>
      {event.rsvpDeadline && <p className="text-xs opacity-70">RSVP by {formatDate(event.rsvpDeadline)}</p>}
    </div>
  )
}
