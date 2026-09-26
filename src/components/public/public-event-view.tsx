"use client"

import { formatDate } from "@/lib/timezone"
import { Fragment, useMemo } from "react"
import { Countdown } from "@/components/public/countdown"
import { googleCalendarUrl, outlookCalendarUrl, icsFileContent } from "@/lib/calendar-links"
import { safeHttpUrl } from "@/lib/image-url"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { buttonStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { RADIUS_PX } from "@/lib/themes"
import { readRsvpSection, type RsvpButtonConfig } from "@/lib/rsvp-settings"
import { HeroDecoration, SectionDivider } from "@/components/public/theme-decorations"
import { RsvpButton, readableTextOn, rsvpButtonStyle } from "@/components/public/rsvp-button"
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
  /** The invitation's RSVP call to action: where it goes, how it looks, and whether name search is on. */
  rsvp: { href: string; button: RsvpButtonConfig; searchEnabled: boolean }
  /** The music control sits bottom-right; a floating RSVP button moves above it. */
  hasMusicControl: boolean
  sections: Section[]
  scheduleItems: ScheduleItem[]
  galleryImages: GalleryImage[]
}

/** Guest-written text (names, venues, descriptions, links) must wrap on narrow phones instead of widening the page. */
const WRAP = "break-words [overflow-wrap:anywhere]"

/**
 * The invitation body. Every visual choice here comes from the resolved theme (colors, fonts per text role,
 * button shape, radius, decoration, section/hero/RSVP/gallery styles), so the owner's preview and the published
 * page are the same render. Mobile-first: one fluid column, clamp() type, nothing with a fixed width that can
 * exceed a 320px screen.
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

  // Where the RSVP button appears. It is always a real link to /events/{slug}/rsvp.
  const cta = event.rsvp.button
  const showCta = cta.show && event.rsvp.searchEnabled
  const hasHero = event.sections.some((s) => s.type === "HERO")
  const hasRsvpSection = event.sections.some((s) => s.type === "RSVP")
  const inHero = showCta && hasHero && (cta.placement === "hero" || cta.placement === "both")
  const inSection = showCta && (cta.placement !== "hero" || !hasHero)
  const floating = showCta && cta.placement === "floating"
  // The owner turned the button on but has no visible RSVP section: add a compact RSVP block so guests can still respond.
  const needsFallback = showCta && !hasRsvpSection && !inHero && !floating
  const footerIndex = event.sections.findIndex((s) => s.type === "FOOTER")

  let bodyIndex = 0
  const fallback = needsFallback ? <RsvpSection key="rsvp-fallback" content={readRsvpSection({ heading: "RSVP" })} event={event} theme={theme} index={bodyIndex} showButton /> : null
  return (
    <div className="w-full max-w-[100vw] overflow-x-clip">
      {event.sections.map((section, i) => {
        const index = section.type === "HERO" || section.type === "FOOTER" ? -1 : bodyIndex++
        return (
          <Fragment key={section.id}>
            {i === footerIndex && fallback}
            <SectionRenderer section={section} index={index} event={event} theme={theme} typeLabel={typeLabel} calendarLinks={calendarLinks} onDownloadIcs={downloadIcs} heroCta={inHero} sectionCta={inSection} />
          </Fragment>
        )
      })}
      {footerIndex === -1 && fallback}
      {floating && (
        <a
          href={event.rsvp.href}
          className={`fixed z-40 inline-flex min-h-12 max-w-[calc(100vw-2rem)] items-center justify-center px-6 text-sm font-semibold uppercase tracking-[0.12em] shadow-lg ${event.hasMusicControl ? "bottom-[4.5rem] right-4" : "bottom-4 left-1/2 -translate-x-1/2"}`}
          style={rsvpButtonStyle({ ...cta, style: cta.style === "outline" ? "solid" : cta.style }, theme)}
        >
          <span className="truncate">{cta.text}</span>
        </a>
      )}
    </div>
  )
}

function SectionRenderer({
  section, index, event, theme, typeLabel, calendarLinks, onDownloadIcs, heroCta, sectionCta,
}: {
  section: Section
  index: number
  event: EventData
  theme: ResolvedTheme
  typeLabel: string
  calendarLinks: { google: string; outlook: string; ics: string } | null
  onDownloadIcs: () => void
  heroCta: boolean
  sectionCta: boolean
}) {
  const content = section.content as Record<string, string | undefined>
  const shell = (title: string, children: React.ReactNode) => <SectionShell title={title} theme={theme} index={index}>{children}</SectionShell>
  const btn = buttonStyle(theme)
  const smallBtn = "inline-flex min-h-11 items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium"

  switch (section.type) {
    case "HERO":
      return (
        <Hero theme={theme} typeLabel={typeLabel} heading={content.heading || event.name} subheading={content.subheading} date={event.date} timeLabel={event.timeLabel}
          cta={heroCta ? <RsvpButton href={event.rsvp.href} config={event.rsvp.button} theme={theme} onAccent={theme.hero === "banner"} className="mt-8" /> : null} />
      )
    case "HOST":
      return (content.text || event.hostName) ? shell("Hosted by", <p className={`text-center opacity-85 ${WRAP}`}>{content.text || event.hostName}</p>) : null
    case "COUNTDOWN":
      return event.date ? shell("Counting down", <Countdown target={event.date} />) : null
    case "VENUE":
      return (event.venueName || event.address) ? shell("Venue", (
        <div className="text-center space-y-3" style={{ fontFamily: "var(--font-venue)" }}>
          {event.venueName && (
            <p className="flex items-start justify-center gap-1.5 font-medium text-[clamp(1rem,4.5vw,1.125rem)]">
              <MapPin className="size-4 shrink-0 mt-1" style={{ color: theme.colors.accent }} aria-hidden /> <span className={WRAP}>{event.venueName}</span>
            </p>
          )}
          {event.address && <p className={`opacity-75 text-sm ${WRAP}`}>{event.address}</p>}
          {safeHttpUrl(event.mapUrl) && (
            <div className="flex justify-center pt-2">
              <a className={`${smallBtn} w-full max-w-sm sm:w-auto`} style={btn} href={safeHttpUrl(event.mapUrl)!} target="_blank" rel="noreferrer">View map &amp; directions <ExternalLink className="size-3.5 shrink-0" aria-hidden /></a>
            </div>
          )}
          {calendarLinks && (
            <div className="pt-1">
              <p className="mb-2 text-xs uppercase tracking-wide opacity-70">Add to calendar</p>
              <div className="mx-auto grid max-w-sm grid-cols-1 gap-2 min-[380px]:grid-cols-3 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center">
                <a className={smallBtn} style={btn} href={calendarLinks.google} target="_blank" rel="noreferrer"><CalendarPlus className="size-3.5 shrink-0" aria-hidden /> Google</a>
                <a className={smallBtn} style={btn} href={calendarLinks.outlook} target="_blank" rel="noreferrer"><CalendarPlus className="size-3.5 shrink-0" aria-hidden /> Outlook</a>
                <button type="button" className={`${smallBtn} cursor-pointer`} style={btn} onClick={onDownloadIcs}><CalendarPlus className="size-3.5 shrink-0" aria-hidden /> Apple</button>
              </div>
            </div>
          )}
        </div>
      ))
      : null
    case "DESCRIPTION":
      return (content.text || event.description) ? shell("About this event", <p className={`text-center opacity-85 whitespace-pre-line max-w-2xl mx-auto leading-relaxed ${WRAP}`}>{content.text || event.description}</p>) : null
    case "SCHEDULE":
      return event.scheduleItems.length ? shell("Schedule", (
        <div className="max-w-md mx-auto space-y-4" style={{ fontFamily: "var(--font-schedule)" }}>
          {event.scheduleItems.map((s) => (
            <div key={s.id} className="flex gap-3 sm:gap-4 border-l-2 pl-3 sm:pl-4" style={{ borderColor: theme.colors.accent }}>
              <div className={`font-semibold w-[4.5rem] sm:w-20 shrink-0 ${WRAP}`} style={{ color: theme.colors.primary }}>{s.time}</div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${WRAP}`}>{s.title}</p>
                {s.description && <p className={`text-sm opacity-75 ${WRAP}`}>{s.description}</p>}
                {s.location && <p className={`text-xs opacity-60 ${WRAP}`}>{s.location}</p>}
              </div>
            </div>
          ))}
        </div>
      )) : null
    case "GALLERY":
      return event.galleryImages.length ? shell("Gallery", <Gallery images={event.galleryImages} theme={theme} />) : null
    case "RSVP":
      return <RsvpSection content={readRsvpSection(section.content)} event={event} theme={theme} index={index} showButton={sectionCta} />
    case "FAQ": {
      const items = (section.content.items as Array<{ q: string; a: string }> | undefined) ?? []
      return items.length ? shell("FAQ", (
        <Accordion type="single" collapsible className="max-w-xl mx-auto">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} style={{ borderColor: theme.colors.border }}>
              <AccordionTrigger className={`text-left ${WRAP}`}>{item.q}</AccordionTrigger>
              <AccordionContent className={`whitespace-pre-line ${WRAP}`}>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )) : null
    }
    case "DRESS_CODE":
      return content.text ? shell("Dress code", <p className={`text-center opacity-85 whitespace-pre-line ${WRAP}`}>{content.text}</p>) : null
    case "GIFT_INFO":
      return content.text ? shell("Gifts", <p className={`text-center opacity-85 whitespace-pre-line ${WRAP}`}>{content.text}</p>) : null
    case "CUSTOM":
      return content.text ? shell(content.heading || "More info", <p className={`text-center opacity-85 whitespace-pre-line ${WRAP}`}>{content.text}</p>) : null
    case "FOOTER":
      return (
        <footer className={`text-center py-10 px-5 text-sm opacity-70 border-t ${WRAP}`} style={{ borderColor: theme.colors.border }}>
          <SectionDivider divider={theme.divider} />
          {content.text || `See you there! — ${event.name}`}
        </footer>
      )
    default:
      return null
  }
}

function Hero({ theme, typeLabel, heading, subheading, date, timeLabel, cta }: { theme: ResolvedTheme; typeLabel: string; heading: string; subheading?: string; date: string | null; timeLabel: string | null; cta: React.ReactNode }) {
  const banner = theme.hero === "banner"
  const color = banner ? theme.colors.accentText : theme.colors.primary
  const background =
    banner ? theme.colors.accent
      : theme.hero === "gradient" ? `linear-gradient(180deg, color-mix(in oklab, ${theme.colors.accent}, transparent 84%), transparent)`
        : "transparent"
  // Fluid title sizes: large and elegant on desktop, smaller but still prominent on a 320px phone.
  const titleSize =
    theme.titleStyle === "script" ? "text-[clamp(2.5rem,12vw,4.5rem)]"
      : theme.titleStyle === "bold" ? "text-[clamp(2rem,10vw,4.5rem)] font-extrabold uppercase tracking-tight"
        : "text-[clamp(2rem,9vw,3.75rem)] font-bold"

  const inner = (
    <>
      <p className="uppercase tracking-[0.2em] sm:tracking-[0.25em] text-xs mb-4" style={{ opacity: 0.8 }}>{typeLabel}</p>
      <h1 className={`${titleSize} mb-4 text-balance leading-tight ${WRAP}`} style={{ fontFamily: "var(--font-title)", color }}>{heading}</h1>
      {subheading && <p className={`text-[clamp(1rem,4.5vw,1.125rem)] ${WRAP}`} style={{ opacity: 0.85 }}>{subheading}</p>}
      {date && (
        <p className="mt-4 text-sm" style={{ opacity: 0.8 }}>
          {formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          {timeLabel ? <span className="block sm:inline">{" · "}{timeLabel}</span> : null}
        </p>
      )}
      {cta}
    </>
  )

  return (
    <section className="relative overflow-hidden text-center py-16 sm:py-24 px-5 sm:px-6" style={{ background, color: banner ? theme.colors.accentText : undefined }}>
      <div style={{ color: banner ? theme.colors.accentText : theme.colors.accent }}><HeroDecoration decoration={theme.decoration} /></div>
      <div className="relative">
        {theme.hero === "framed" ? (
          <div className="mx-auto max-w-2xl border px-5 py-10 sm:px-12 sm:py-12" style={{ borderColor: theme.colors.accent, outline: `1px solid ${theme.colors.border}`, outlineOffset: 6, borderRadius: RADIUS_PX[theme.radius], background: theme.colors.surface }}>{inner}</div>
        ) : theme.hero === "arch" ? (
          <div className="mx-auto max-w-xl px-5 pt-14 pb-10 sm:px-12 sm:pt-16 sm:pb-12" style={{ borderRadius: "999px 999px 24px 24px", background: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>{inner}</div>
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
    <section className={boxed ? "px-4 py-5 sm:py-8" : "py-12 sm:py-14 px-5 sm:px-6"} style={alternate ? { background: theme.colors.surface } : undefined}>
      <div className={boxed ? "mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-10" : alternate ? "py-2" : undefined} style={boxStyle}>
        <SectionTitle title={title} theme={theme} />
        {children}
      </div>
    </section>
  )
}

function SectionTitle({ title, theme, align = "center", color }: { title: string; theme: ResolvedTheme; align?: "left" | "center" | "right"; color?: string }) {
  const alignClass = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"
  const base = `${alignClass} mb-6 sm:mb-8 ${WRAP}`
  const style: React.CSSProperties = { fontFamily: "var(--font-heading)", color: color ?? theme.colors.primary }
  const accent = color ?? theme.colors.accent
  switch (theme.titleStyle) {
    case "spaced":
      return <h2 className={`${base} text-sm sm:text-base font-semibold uppercase tracking-[0.25em] sm:tracking-[0.35em]`} style={{ ...style, color: accent }}>{title}</h2>
    case "script":
      return <h2 className={`${base} text-[clamp(2rem,9vw,2.25rem)] leading-tight`} style={{ ...style, fontFamily: "var(--font-title)", color: accent }}>{title}</h2>
    case "underline":
      return <h2 className={`${base} text-[clamp(1.35rem,6vw,1.5rem)] font-semibold underline decoration-2 underline-offset-8`} style={{ ...style, textDecorationColor: accent }}>{title}</h2>
    case "bold":
      return <h2 className={`${base} text-[clamp(1.5rem,7vw,1.875rem)] font-extrabold uppercase tracking-tight`} style={style}>{title}</h2>
    default:
      return <h2 className={`${base} text-[clamp(1.5rem,6.5vw,1.875rem)] font-bold`} style={{ ...style, color: accent }}>{title}</h2>
  }
}

function Gallery({ images, theme }: { images: GalleryImage[]; theme: ResolvedTheme }) {
  const radius = RADIUS_PX[theme.radius]
  // One column on small phones (≤379px), two on larger phones and tablets, three from medium screens up.
  return (
    <div className={`grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 ${theme.gallery === "polaroid" ? "gap-5" : "gap-3"} max-w-3xl mx-auto`}>
      {images.map((g, i) => {
        // eslint-disable-next-line @next/next/no-img-element
        const img = <img src={g.url} alt={g.caption ?? ""} loading="lazy" decoding="async" className="block w-full max-w-full h-auto aspect-square object-cover" style={
          theme.gallery === "rounded" ? { borderRadius: Math.max(radius, 8) }
            : theme.gallery === "arch" ? { borderRadius: "999px 999px 12px 12px", aspectRatio: "3 / 4" }
              : theme.gallery === "circle" ? { borderRadius: "999px" }
                : undefined
        } />
        if (theme.gallery === "polaroid") {
          return (
            <figure key={g.id} className="min-w-0 bg-white p-2 pb-6 shadow-md" style={{ transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)` }}>
              {img}
              {g.caption && <figcaption className={`mt-2 text-center text-xs text-neutral-600 ${WRAP}`} style={{ fontFamily: "var(--font-title)" }}>{g.caption}</figcaption>}
            </figure>
          )
        }
        return <div key={g.id} className="min-w-0">{img}</div>
      })}
    </div>
  )
}

const SPACING: Record<"compact" | "normal" | "spacious", { outer: string; inner: string }> = {
  compact: { outer: "py-6 sm:py-8", inner: "py-6 sm:py-8" },
  normal: { outer: "py-10 sm:py-14", inner: "py-8 sm:py-10" },
  spacious: { outer: "py-14 sm:py-20", inner: "py-10 sm:py-14" },
}

/**
 * The editable RSVP section: heading, description, deadline and the RSVP NOW button. Its text, alignment,
 * spacing and background come from the section's own content; colors and fonts from the theme.
 */
function RsvpSection({ content, event, theme, index, showButton }: { content: ReturnType<typeof readRsvpSection>; event: EventData; theme: ResolvedTheme; index: number; showButton: boolean }) {
  const radius = RADIUS_PX[theme.radius]
  const alternate = theme.sections === "alternating" && index % 2 === 1
  const themeFilled = content.background === "none" && theme.rsvp === "filled"
  const onAccent = themeFilled || content.background === "accent"
  const box: React.CSSProperties =
    content.background === "custom" && content.backgroundColor ? { background: content.backgroundColor, color: readableTextOn(content.backgroundColor), borderRadius: radius }
      : onAccent ? { background: theme.colors.accent, color: theme.colors.accentText, borderRadius: radius }
        : content.background === "surface" ? { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: radius }
          : theme.rsvp === "outlined" ? { border: `1.5px solid ${theme.colors.accent}`, borderRadius: radius }
            : { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: radius }
  const customText = content.background === "custom" && content.backgroundColor ? readableTextOn(content.backgroundColor) : undefined
  const titleColor = onAccent ? theme.colors.accentText : customText
  const alignClass = content.align === "left" ? "text-left" : content.align === "right" ? "text-right" : "text-center"
  const spacing = SPACING[content.spacing]
  const deadline = event.rsvpDeadline ? formatDate(event.rsvpDeadline, { month: "long", day: "numeric", year: "numeric" }) : null

  return (
    <section id="rsvp" className={`px-4 sm:px-6 ${spacing.outer} scroll-mt-4`} style={alternate ? { background: theme.colors.surface } : undefined}>
      <div className={`mx-auto max-w-2xl px-5 sm:px-10 ${spacing.inner} space-y-4 ${alignClass}`} style={{ ...box, fontFamily: "var(--font-rsvp)" }}>
        <SectionTitle title={content.heading} theme={theme} align={content.align} color={titleColor} />
        {content.text && <p className={`-mt-2 opacity-90 whitespace-pre-line leading-relaxed ${WRAP}`}>{content.text}</p>}
        {deadline && <p className="text-sm font-medium opacity-80">RSVP by {deadline}</p>}
        {!event.rsvp.searchEnabled ? (
          <p className="text-sm opacity-85">Please use the personal RSVP link sent to your email or phone to respond.</p>
        ) : showButton ? (
          <RsvpButton href={event.rsvp.href} config={event.rsvp.button} theme={theme} onAccent={onAccent} className="pt-2" />
        ) : null}
      </div>
    </section>
  )
}
