import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventLimits } from "@/lib/entitlements"
import { QuestionsBuilder } from "@/components/guests/questions-builder"

export default async function RsvpQuestionsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params

  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) notFound()

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
