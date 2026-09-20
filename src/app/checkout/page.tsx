import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventAccessRole } from "@/lib/event-access"
import { getEffectivePlan, hasUnlimitedAccount, PLAN_RANK, PLAN_PRICING } from "@/lib/entitlements"
import { getDisplayPaymentSettings } from "@/lib/platform-settings"
import { Logo } from "@/components/brand/logo"
import { CheckoutForm } from "@/components/payments/checkout-form"
import type { PlanKey } from "@prisma/client"

export const dynamic = "force-dynamic"

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; eventId?: string }>
}) {
  const user = await requireUser()
  const { plan: planParam, eventId } = await searchParams

  const plan = planParam as PlanKey
  if (!plan || !["PREMIUM", "PRO", "UNLIMITED"].includes(plan)) notFound()

  const unlimited = await hasUnlimitedAccount(user.id)
  if (unlimited) redirect(eventId ? `/dashboard/events/${eventId}` : "/dashboard")

  let event: { id: string; name: string; slug: string } | null = null
  if (plan !== "UNLIMITED") {
    if (!eventId) notFound()
    const role = await getEventAccessRole(user.id, eventId)
    if (!role) notFound()
    const found = await db.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, slug: true } })
    if (!found) notFound()
    event = found

    const currentPlan = await getEffectivePlan(user.id, eventId)
    if (PLAN_RANK[currentPlan] >= PLAN_RANK[plan]) {
      redirect(`/dashboard/events/${eventId}/upgrade`)
    }
  }

  const checkoutSettings = await getDisplayPaymentSettings()
  const pricing = PLAN_PRICING[plan]

  return (
    <div className="min-h-screen bg-secondary/40 flex flex-col">
      <header className="p-6">
        <Link href="/dashboard">
          <Logo textClassName="text-xl" markClassName="size-7" />
        </Link>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8 space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Complete your payment</h1>
            <p className="text-muted-foreground">One-time payment. Reviewed and approved manually — no auto-charges, ever.</p>
          </div>
          <CheckoutForm
            plan={plan}
            planLabel={pricing.label}
            amount={pricing.price}
            event={event}
            user={{ name: user.name ?? "", email: user.email ?? "" }}
            settings={JSON.parse(JSON.stringify(checkoutSettings))}
          />
        </div>
      </main>
    </div>
  )
}
