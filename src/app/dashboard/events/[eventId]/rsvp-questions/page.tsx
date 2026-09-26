import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { getEventLimits } from "@/lib/entitlements"
import { readRsvpPrompt } from "@/lib/rsvp-prompt"
import { resolveTheme } from "@/lib/theme-resolve"
import { QuestionsBuilder } from "@/components/guests/questions-builder"
import { RsvpPromptEditor } from "@/components/guests/rsvp-prompt-editor"

export default async function RsvpQuestionsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user, event } = await getEventContext(eventId)

  const [questions, limits, page] = await Promise.all([
    db.customQuestion.findMany({ where: { eventId }, orderBy: { order: "asc" } }),
    getEventLimits(user.id, eventId),
    db.eventPage.findUnique({ where: { eventId }, select: { layout: true, colors: true, fonts: true, theme: { select: { key: true } } } }),
  ])
  const layout = (page?.layout ?? null) as { themeKey?: string } | null
  const theme = resolveTheme({ themeKey: layout?.themeKey, legacyThemeKey: page?.theme?.key, colors: page?.colors, fonts: page?.fonts })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">RSVP Questions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Set the main RSVP question, then ask guests anything else when they RSVP.
          {limits.maxCustomQuestions !== "unlimited" && ` Your plan allows up to ${limits.maxCustomQuestions} extra question(s).`}
        </p>
      </div>
      <RsvpPromptEditor eventId={eventId} initial={readRsvpPrompt(page?.layout)} allowMaybe={event.allowMaybe} theme={theme} />
      <QuestionsBuilder eventId={eventId} questions={JSON.parse(JSON.stringify(questions))} />
    </div>
  )
}
