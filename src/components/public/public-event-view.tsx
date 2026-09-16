"use client"

import { useMemo } from "react"
import { Countdown } from "@/components/public/countdown"
import { googleCalendarUrl, outlookCalendarUrl, icsFileContent } from "@/lib/calendar-links"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { ResolvedTheme } from "@/lib/theme-resolve"
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
  sections: Section[]
  scheduleItems: ScheduleItem[]
  galleryImages: GalleryImage[]
}

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
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {event.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} event={event} theme={theme} typeLabel={typeLabel} calendarLinks={calendarLinks} onDownloadIcs={downloadIcs} />
      ))}
    </div>
  )
}

function SectionRenderer({
  section, event, theme, typeLabel, calendarLinks, onDownloadIcs,
}: {
  section: Section
  event: EventData
  theme: ResolvedTheme
  typeLabel: string
  calendarLinks: { google: string; outlook: string; ics: string } | null
  onDownloadIcs: () => void
}) {
  const content = section.content as Record<string, string | undefined>

  switch (section.type) {
    case "HERO":
      return (
        <section className="text-center py-24 px-6" style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${theme.accent}, transparent 88%), transparent)` }}>
          <p className="uppercase tracking-[0.2em] text-xs opacity-70 mb-4">{typeLabel}</p>
          <h1 className="font-heading text-4xl sm:text-6xl font-bold mb-4 text-balance">{content.heading || event.name}</h1>
          {content.subheading && <p className="text-lg opacity-80">{content.subheading}</p>}
          {event.date && (
            <p className="mt-4 text-sm opacity-70">
              {new Date(event.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {event.timeLabel ? ` · ${event.timeLabel}` : ""}
            </p>
          )}
        </section>
      )
    case "HOST":
      return content.text ? (
        <SectionShell title="Hosted by" theme={theme}><p className="text-center opacity-80">{content.text || event.hostName}</p></SectionShell>
      ) : event.hostName ? (
        <SectionShell title="Hosted by" theme={theme}><p className="text-center opacity-80">{event.hostName}</p></SectionShell>
      ) : null
    case "COUNTDOWN":
      return event.date ? <SectionShell title="Counting down" theme={theme}><Countdown target={event.date} /></SectionShell> : null
    case "VENUE":
      return (event.venueName || event.address) ? (
        <SectionShell title="Venue" theme={theme}>
          <div className="text-center space-y-3">
            <p className="flex items-center justify-center gap-1.5 font-medium"><MapPin className="size-4" /> {event.venueName}</p>
            {event.address && <p className="opacity-70 text-sm">{event.address}</p>}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {event.mapUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={event.mapUrl} target="_blank" rel="noreferrer">Get directions <ExternalLink className="size-3.5" /></a>
                </Button>
              )}
              {calendarLinks && (
                <>
                  <Button variant="outline" size="sm" asChild><a href={calendarLinks.google} target="_blank" rel="noreferrer"><CalendarPlus className="size-3.5" /> Google</a></Button>
                  <Button variant="outline" size="sm" asChild><a href={calendarLinks.outlook} target="_blank" rel="noreferrer"><CalendarPlus className="size-3.5" /> Outlook</a></Button>
                  <Button variant="outline" size="sm" onClick={onDownloadIcs}><CalendarPlus className="size-3.5" /> Apple / .ics</Button>
                </>
              )}
            </div>
          </div>
        </SectionShell>
      ) : null
    case "DESCRIPTION":
      return (content.text || event.description) ? (
        <SectionShell title="About this event" theme={theme}><p className="text-center opacity-80 whitespace-pre-line max-w-2xl mx-auto">{content.text || event.description}</p></SectionShell>
      ) : null
    case "SCHEDULE":
      return event.scheduleItems.length ? (
        <SectionShell title="Schedule" theme={theme}>
          <div className="max-w-md mx-auto space-y-4">
            {event.scheduleItems.map((s) => (
              <div key={s.id} className="flex gap-4 border-l-2 pl-4" style={{ borderColor: theme.accent }}>
                <div className="font-heading font-semibold w-20 shrink-0">{s.time}</div>
                <div>
                  <p className="font-medium">{s.title}</p>
                  {s.description && <p className="text-sm opacity-70">{s.description}</p>}
                  {s.location && <p className="text-xs opacity-60">{s.location}</p>}
                </div>
              </div>
            ))}
          </div>
        </SectionShell>
      ) : null
    case "GALLERY":
      return event.galleryImages.length ? (
        <SectionShell title="Gallery" theme={theme}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {event.galleryImages.map((g) => <img key={g.id} src={g.url} alt={g.caption ?? ""} className="w-full aspect-square object-cover rounded-lg" />)}
          </div>
        </SectionShell>
      ) : null
    case "RSVP":
      return (
        <SectionShell title="RSVP" theme={theme}>
          <div className="text-center space-y-3">
            <p className="opacity-80">
              {event.personalizedRsvpOnly
                ? "Please use the personal RSVP link sent to your email or phone to respond."
                : "We'd love to know if you can make it."}
            </p>
            {event.rsvpDeadline && (
              <p className="text-xs opacity-60">RSVP by {new Date(event.rsvpDeadline).toLocaleDateString()}</p>
            )}
          </div>
        </SectionShell>
      )
    case "FAQ": {
      const items = (section.content.items as Array<{ q: string; a: string }> | undefined) ?? []
      return items.length ? (
        <SectionShell title="FAQ" theme={theme}>
          <Accordion type="single" collapsible className="max-w-xl mx-auto">
            {items.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SectionShell>
      ) : null
    }
    case "DRESS_CODE":
      return content.text ? <SectionShell title="Dress code" theme={theme}><p className="text-center opacity-80">{content.text}</p></SectionShell> : null
    case "GIFT_INFO":
      return content.text ? <SectionShell title="Gifts" theme={theme}><p className="text-center opacity-80">{content.text}</p></SectionShell> : null
    case "CUSTOM":
      return content.text ? <SectionShell title={content.heading || "More info"} theme={theme}><p className="text-center opacity-80 whitespace-pre-line">{content.text}</p></SectionShell> : null
    case "FOOTER":
      return (
        <footer className="text-center py-10 text-sm opacity-60 border-t" style={{ borderColor: `color-mix(in oklab, ${theme.primary}, transparent 85%)` }}>
          {content.text || `See you there! — ${event.name}`}
        </footer>
      )
    default:
      return null
  }
}

function SectionShell({ title, theme, children }: { title: string; theme: ResolvedTheme; children: React.ReactNode }) {
  return (
    <section className="py-14 px-6">
      <h2 className="font-heading text-2xl font-bold text-center mb-8" style={{ color: theme.accent }}>{title}</h2>
      {children}
    </section>
  )
}
