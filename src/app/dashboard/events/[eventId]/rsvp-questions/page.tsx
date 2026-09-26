import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { getEventLimits } from "@/lib/entitlements"
import { readRsvpPrompt } from "@/lib/rsvp-prompt"
import { lookupMode, readRsvpButton, readRsvpForm, rsvpPath } from "@/lib/rsvp-settings"
import { resolveTheme } from "@/lib/theme-resolve"
import { SITE_URL } from "@/lib/site"
import { QuestionsBuilder } from "@/components/guests/questions-builder"
import { RsvpPromptEditor } from "@/components/guests/rsvp-prompt-editor"
import { RsvpSettingsPanel } from "@/components/guests/rsvp-settings-panel"

export default async function RsvpQuestionsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user, event } = await getEventContext(eventId)

  const [questions, limits, page, rsvpSection] = await Promise.all([
    db.customQuestion.findMany({ where: { eventId }, orderBy: { order: "asc" } }),
    getEventLimits(user.id, eventId),
    db.eventPage.findUnique({ where: { eventId }, select: { layout: true, colors: true, fonts: true, theme: { select: { key: true } } } }),
    db.eventSection.findFirst({ where: { eventId, type: "RSVP", visible: true }, select: { id: true } }),
  ])
  const layout = (page?.layout ?? null) as { themeKey?: string } | null
  const theme = resolveTheme({ themeKey: layout?.themeKey, legacyThemeKey: page?.theme?.key, colors: page?.colors, fonts: page?.fonts })
  const form = readRsvpForm(page?.layout)

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">RSVP Setup</h1>
        <p className="text-muted-foreground text-sm mt-1">
          The RSVP button on your invitation, your RSVP page, the main question and anything else you want to ask.
          {limits.maxCustomQuestions !== "unlimited" && ` Your plan allows up to ${limits.maxCustomQuestions} extra question(s).`}
        </p>
      </div>
      <RsvpSettingsPanel
        eventId={eventId}
        rsvpUrl={`${SITE_URL}${rsvpPath(event.slug)}`}
        theme={theme}
        button={readRsvpButton(page?.layout)}
        form={{ ...form, lookup: lookupMode(form, event.personalizedRsvpOnly) }}
        deadline={event.rsvpDeadline ? event.rsvpDeadline.toISOString().slice(0, 10) : null}
        allowLateRsvp={event.allowLateRsvp}
        hasRsvpSection={!!rsvpSection}
      />
      <RsvpPromptEditor eventId={eventId} initial={readRsvpPrompt(page?.layout)} allowMaybe={event.allowMaybe} theme={theme} />
      <QuestionsBuilder eventId={eventId} questions={JSON.parse(JSON.stringify(questions))} />
    </div>
  )
}
