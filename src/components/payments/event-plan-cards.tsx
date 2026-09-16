import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPHP, PLAN_RANK } from "@/lib/entitlements"
import type { PlanKey } from "@prisma/client"

const FEATURES: Record<PlanKey, string[]> = {
  FREE: ["Basic invitation", "Basic RSVP", "Up to 30 guests", "Basic seating"],
  PREMIUM: ["Premium themes", "Canva-style editor", "AI invitation generator", "Custom RSVP questions", "Advanced seating", "Gallery, maps & QR", "Exports", "Remove branding"],
  PRO: ["Everything in Premium", "Unlimited guests", "Advanced floor plan", "Coordinator tools", "Client collaboration", "Co-branding", "Advanced analytics & exports"],
  UNLIMITED: ["Everything in Pro", "Applies to your whole account", "Unlimited events", "New events auto-unlock"],
}

export function EventPlanCards({
  eventId, currentPlan, pricing,
}: { eventId: string; currentPlan: PlanKey; pricing: Record<PlanKey, { label: string; price: number; scope: string }> }) {
  const plans: PlanKey[] = ["FREE", "PREMIUM", "PRO", "UNLIMITED"]

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {plans.map((key) => {
        const isCurrent = key === currentPlan
        const isDowngrade = PLAN_RANK[key] < PLAN_RANK[currentPlan]
        return (
          <Card key={key} className={isCurrent ? "border-primary/60 ring-1 ring-primary/40" : "border-border/70"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading">{pricing[key].label}</CardTitle>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <p className="font-heading text-2xl font-semibold">
                {key === "FREE" ? "₱0" : formatPHP(pricing[key].price)}
                <span className="text-sm font-normal text-muted-foreground"> {key === "UNLIMITED" ? "whole account" : "/event"}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {FEATURES[key].map((f) => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" /> {f}</li>
                ))}
              </ul>
              {key !== "FREE" && !isCurrent && !isDowngrade && (
                <Button className="w-full" asChild>
                  <Link href={`/checkout?plan=${key}${key === "UNLIMITED" ? "" : `&eventId=${eventId}`}`}>Get {pricing[key].label}</Link>
                </Button>
              )}
              {isDowngrade && <p className="text-xs text-muted-foreground text-center">Included in your current plan</p>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
