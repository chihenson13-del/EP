import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { loadGuestForForm, loadRsvpEvent } from "@/lib/rsvp-page-data"
import { lookupMode, readRsvpForm } from "@/lib/rsvp-settings"
import { sessionCookieName, verifySession } from "@/lib/rsvp-lookup"
import { RADIUS_PX } from "@/lib/themes"
import { RsvpShell, isDeadlinePassed, rsvpTheme } from "@/components/public/rsvp-shell"
import { RsvpGuestForm } from "@/components/public/rsvp-guest-form"
import { FindInvitation, NotYou } from "@/components/public/find-invitation"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await loadRsvpEvent(slug)
  return { title: event ? `RSVP · ${event.name}` : "RSVP", robots: { index: false, follow: false } }
}

/**
 * /events/{slug}/rsvp — the RSVP page behind the invitation's "RSVP NOW" button.
 * No guest chosen yet → "Find Your Invitation" (name search). A guest chosen on this device (signed httpOnly
 * session cookie, bound to this event) → that guest's RSVP form, straight away, without searching again.
 */
export default async function RsvpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await loadRsvpEvent(slug)
  if (!event) notFound()

  const theme = rsvpTheme(event)
  const form = readRsvpForm(event.page?.layout)
  const lookup = lookupMode(form, event.personalizedRsvpOnly)
  const guestId = lookup === "off" ? null : verifySession((await cookies()).get(sessionCookieName(event.id))?.value, event.id)
  const loaded = guestId ? await loadGuestForForm(guestId, event.id) : null
  const card: React.CSSProperties = { background: theme.colors.surface, color: theme.colors.text, border: `1px solid ${theme.colors.border}`, borderRadius: RADIUS_PX[theme.radius] }

  let body: React.ReactNode
  if (loaded) {
    body = (
      <div className="space-y-4">
        <RsvpGuestForm event={event} theme={theme} loaded={loaded} mode={{ kind: "session", slug: event.slug }} />
        <NotYou slug={event.slug} firstName={loaded.guest.firstName} />
      </div>
    )
  } else if (isDeadlinePassed(event)) {
    body = (
      <div className="p-6 text-center space-y-2" style={card} role="status">
        <p className="font-medium">The RSVP deadline for this event has passed.</p>
        <p className="text-sm opacity-75">Please contact the host if your plans have changed.</p>
      </div>
    )
  } else if (lookup === "off") {
    body = (
      <div className="p-6 text-center space-y-2" style={card} role="status">
        <p className="font-medium">Please use your personal RSVP link.</p>
        <p className="text-sm opacity-75">The host sent each guest a personal link by email, text or message. Open that link to respond.</p>
      </div>
    )
  } else {
    body = <FindInvitation slug={event.slug} theme={theme} />
  }

  return <RsvpShell event={event} theme={theme} intro={form.intro}>{body}</RsvpShell>
}
