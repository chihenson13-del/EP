import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { loadGuestForForm, loadRsvpEvent } from "@/lib/rsvp-page-data"
import { readRsvpForm } from "@/lib/rsvp-settings"
import { RsvpShell, rsvpTheme } from "@/components/public/rsvp-shell"
import { RsvpGuestForm } from "@/components/public/rsvp-guest-form"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await loadRsvpEvent(slug, "token")
  return { title: event ? `RSVP · ${event.name}` : "RSVP", robots: { index: false, follow: false }, referrer: "no-referrer" }
}

/**
 * /events/{slug}/rsvp/{token} — a guest's personal RSVP link. The secret token identifies exactly one guest of
 * exactly this event (both are checked in one query), and the form submits with that token, which the server
 * re-checks — changing anything in the URL can never open or change another guest's RSVP.
 */
export default async function PersonalRsvpPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(token)) notFound()
  const event = await loadRsvpEvent(slug, "token")
  if (!event) notFound()

  const match = await db.guest.findFirst({ where: { rsvpToken: token, eventId: event.id }, select: { id: true } })
  if (!match) notFound()
  const loaded = await loadGuestForForm(match.id, event.id)
  if (!loaded) notFound()

  const theme = rsvpTheme(event)
  const form = readRsvpForm(event.page?.layout)
  return (
    <RsvpShell event={event} theme={theme} intro={form.intro}>
      <RsvpGuestForm event={event} theme={theme} loaded={loaded} mode={{ kind: "token", rsvpToken: token }} />
    </RsvpShell>
  )
}
