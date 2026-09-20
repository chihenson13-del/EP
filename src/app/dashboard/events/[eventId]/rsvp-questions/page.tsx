import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { getEventLimits } from "@/lib/entitlements"
import { QuestionsBuilder } from "@/components/guests/questions-builder"

export default async function RsvpQuestionsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user } = await getEventContext(eventId)

  const [questions, limits] = await Promise.all([
    db.customQuestion.findMany({ where: { eventId }, orderBy: { order: "asc" } }),
    getEventLimits(user.id, eventId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">RSVP Questions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask guests anything when they RSVP.
          {limits.maxCustomQuestions !== "unlimited" && ` Your plan allows up to ${limits.maxCustomQuestions} question(s).`}
        </p>
      </div>
      <QuestionsBuilder eventId={eventId} questions={JSON.parse(JSON.stringify(questions))} />
    </div>
  )
}
