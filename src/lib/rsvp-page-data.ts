import { cache } from "react"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { getEventAccessRole } from "@/lib/event-access"

const rsvpEventSelect = {
  id: true, slug: true, name: true, status: true, isPublic: true, date: true, timeLabel: true, venueName: true, address: true,
  rsvpDeadline: true, allowLateRsvp: true, allowMaybe: true, personalizedRsvpOnly: true,
  musicEnabled: true, musicYoutubeVideoId: true, musicTitle: true, musicAutoplay: true, musicStartMuted: true, musicLoop: true, musicVolume: true, musicShowControl: true, musicShowPlayer: true,
  page: { select: { layout: true, colors: true, fonts: true, theme: { select: { key: true } } } },
} as const

/**
 * The event behind a public RSVP URL.
 *  - "search" (/events/{slug}/rsvp): guests can use it once the event is published and public; the owner and
 *    collaborators can also open it for a draft (to test the flow from the preview).
 *  - "token" (/events/{slug}/rsvp/{token}): the guest's secret personal token is the authorization, so it works for
 *    any event that isn't archived — including private (not public) events, exactly like the old personal links.
 * Anything else is "not found".
 */
export const loadRsvpEvent = cache(async (slug: string, via: "search" | "token" = "search") => {
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,120}$/i.test(slug)) return null
  const event = await db.event.findUnique({ where: { slug }, select: rsvpEventSelect })
  if (!event || event.status === "ARCHIVED") return null
  if (event.status === "PUBLISHED" && event.isPublic) return { ...event, previewOnly: false as const }
  if (via === "token") return { ...event, previewOnly: event.status !== "PUBLISHED" }

  const session = await auth()
  const userId = session?.user?.id
  if (userId && (await getEventAccessRole(userId, event.id))) return { ...event, previewOnly: true as const }
  return null
})

export type RsvpEvent = NonNullable<Awaited<ReturnType<typeof loadRsvpEvent>>>

/** What the RSVP form needs about one guest — never other guests, never host-only fields. */
export async function loadGuestForForm(guestId: string, eventId: string) {
  const guest = await db.guest.findFirst({
    where: { id: guestId, eventId },
    select: {
      id: true, firstName: true, lastName: true, rsvpStatus: true, rsvpAnswer: true, plusOneAllowed: true, maxPlusOnes: true,
      numberAttending: true, mealPreference: true, dietaryRestrictions: true, rsvpMessage: true, respondedAt: true,
      plusOnes: { select: { name: true } },
      answers: { select: { questionId: true, value: true } },
    },
  })
  if (!guest) return null
  const questions = await db.customQuestion.findMany({
    where: { eventId }, orderBy: { order: "asc" },
    select: { id: true, label: true, type: true, required: true, options: true },
  })
  return { guest, questions }
}
