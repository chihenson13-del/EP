import { getEventContext } from "@/lib/event-access"
import { EventSettingsForm } from "@/components/events/event-settings-form"

export default async function EventSettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { event } = await getEventContext(eventId)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Event Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Details, RSVP rules, and privacy for {event.name}.</p>
      </div>
      <EventSettingsForm event={JSON.parse(JSON.stringify(event))} />
    </div>
  )
}
