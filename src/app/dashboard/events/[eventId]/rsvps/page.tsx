import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { readRsvpForm, rsvpPath } from "@/lib/rsvp-settings"
import { SITE_URL } from "@/lib/site"
import { RsvpResponses, type ResponseGuest, type RsvpSummary } from "@/components/guests/rsvp-responses"

export const dynamic = "force-dynamic"

/**
 * RSVP Responses: every guest of this event with their own RSVP, read straight from the database (Guest row =
 * the guest's one RSVP response; plus-ones and custom answers hang off it). Nothing here is cached or sample data.
 */
export default async function RsvpResponsesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { event } = await getEventContext(eventId)

  const [guests, questions, tables, page] = await Promise.all([
    db.guest.findMany({
      relationLoadStrategy: "join",
      where: { eventId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, facebookProfileUrl: true, category: true, notes: true,
        rsvpStatus: true, rsvpAnswer: true, rsvpMessage: true, rsvpToken: true, numberAttending: true, respondedAt: true, rsvpFirstRespondedAt: true, updatedAt: true,
        plusOneAllowed: true, maxPlusOnes: true, childrenCount: true, mealPreference: true, dietaryRestrictions: true, groupId: true,
        checkedIn: true, checkedInAt: true,
        plusOnes: { select: { id: true, name: true } },
        answers: { select: { questionId: true, value: true } },
        chair: { select: { seatNumber: true, table: { select: { id: true, name: true } } } },
      },
    }),
    db.customQuestion.findMany({ where: { eventId }, orderBy: { order: "asc" }, select: { id: true, label: true } }),
    db.table.findMany({ where: { eventId }, orderBy: [{ number: "asc" }, { name: "asc" }], select: { id: true, name: true, chairs: { select: { guestId: true, status: true } } } }),
    db.eventPage.findUnique({ where: { eventId }, select: { layout: true } }),
  ])

  const attending = guests.filter((g) => g.rsvpStatus === "ATTENDING")
  const summary: RsvpSummary = {
    invited: guests.length,
    attending: attending.length,
    declined: guests.filter((g) => g.rsvpStatus === "DECLINED").length,
    pending: guests.filter((g) => g.rsvpStatus === "PENDING").length,
    maybe: guests.filter((g) => g.rsvpStatus === "MAYBE").length,
    attendees: attending.reduce((sum, g) => sum + Math.max(1, g.numberAttending ?? 1), 0),
    showMaybe: event.allowMaybe || guests.some((g) => g.rsvpStatus === "MAYBE"),
  }

  const rows: ResponseGuest[] = guests.map((g) => ({
    ...g,
    respondedAt: g.respondedAt?.toISOString() ?? null,
    rsvpFirstRespondedAt: g.rsvpFirstRespondedAt?.toISOString() ?? null,
    updatedAt: g.updatedAt.toISOString(),
    checkedInAt: g.checkedInAt?.toISOString() ?? null,
    answers: g.answers.map((a) => ({ questionId: a.questionId, value: Array.isArray(a.value) ? a.value.map(String).join(", ") : a.value === null ? "" : String(a.value) })),
  }))

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">RSVP Responses</h1>
        <p className="text-muted-foreground text-sm mt-1">Every guest&apos;s RSVP, straight from your guest list. New responses appear here as soon as a guest submits.</p>
      </div>
      <RsvpResponses
        eventId={eventId}
        summary={summary}
        guests={rows}
        questions={questions}
        tables={tables.map((t) => ({ id: t.id, name: t.name, free: t.chairs.filter((c) => !c.guestId && c.status === "EMPTY").length }))}
        mealOptions={readRsvpForm(page?.layout).mealOptions}
        invitationUrl={`${SITE_URL}/e/${event.slug}`}
        invitationLive={event.status === "PUBLISHED" && event.isPublic}
        rsvpBaseUrl={`${SITE_URL}${rsvpPath(event.slug)}`}
        allowMaybe={event.allowMaybe}
      />
    </div>
  )
}
