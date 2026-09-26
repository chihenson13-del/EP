import { permanentRedirect } from "next/navigation"
import { rsvpPath } from "@/lib/rsvp-settings"

/** Old personal-link format (/rsvp/{slug}/{token}), still inside invitations already sent: forwards to the new page. */
export default async function LegacyGuestRsvpPage({ params }: { params: Promise<{ eventSlug: string; guestToken: string }> }) {
  const { eventSlug, guestToken } = await params
  permanentRedirect(rsvpPath(eventSlug, guestToken))
}
