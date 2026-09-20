import { getEventContext } from "@/lib/event-access"
import { getEffectivePlan, hasUnlimitedAccount, PLAN_PRICING } from "@/lib/entitlements"
import { EventPlanCards } from "@/components/payments/event-plan-cards"
import { Badge } from "@/components/ui/badge"

export default async function EventUpgradePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user, event } = await getEventContext(eventId)

  const [plan, unlimited] = await Promise.all([getEffectivePlan(user.id, eventId), hasUnlimitedAccount(user.id)])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Upgrade {event.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">One-time payments. No subscriptions.</p>
        <div className="mt-2">
          <Badge>{unlimited ? "UNLIMITED ACCESS" : `Current plan: ${plan}`}</Badge>
        </div>
      </div>

      {unlimited ? (
        <p className="text-sm text-muted-foreground">Your account has Unlimited Access — every event, including this one, already has every feature unlocked.</p>
      ) : (
        <EventPlanCards eventId={eventId} currentPlan={plan} pricing={PLAN_PRICING} />
      )}
    </div>
  )
}
