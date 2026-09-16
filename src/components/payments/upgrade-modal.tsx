"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PLAN_PRICING, formatPHP } from "@/lib/entitlements"

export function UpgradeModal({ open, onOpenChange, eventId, featureLabel }: { open: boolean; onOpenChange: (open: boolean) => void; eventId?: string; featureLabel?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-accent/40 text-primary">
            <Lock className="size-5" />
          </div>
          <DialogTitle className="text-center font-heading">Unlock this feature</DialogTitle>
          <DialogDescription className="text-center">
            {featureLabel ? `${featureLabel} is` : "This feature is"} available with Premium and Pro.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button variant="outline" className="justify-between" asChild>
            <Link href={`/checkout?plan=PREMIUM${eventId ? `&eventId=${eventId}` : ""}`}>
              Get Premium <span className="text-muted-foreground">{formatPHP(PLAN_PRICING.PREMIUM.price)}/event</span>
            </Link>
          </Button>
          <Button variant="outline" className="justify-between" asChild>
            <Link href={`/checkout?plan=PRO${eventId ? `&eventId=${eventId}` : ""}`}>
              Get Pro <span className="text-muted-foreground">{formatPHP(PLAN_PRICING.PRO.price)}/event</span>
            </Link>
          </Button>
          <Button className="justify-between" asChild>
            <Link href="/checkout?plan=UNLIMITED">
              Unlock Unlimited <span>{formatPHP(PLAN_PRICING.UNLIMITED.price)}</span>
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
