"use client"

import { useState } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UpgradeModal } from "@/components/payments/upgrade-modal"

export function UpgradeNotice({ eventId, featureLabel }: { eventId: string; featureLabel: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-16 flex justify-center">
      <Card className="max-w-sm text-center">
        <CardContent className="p-8 space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <p className="font-medium">{featureLabel} requires Premium or higher.</p>
          <Button onClick={() => setOpen(true)}>Unlock this feature</Button>
        </CardContent>
      </Card>
      <UpgradeModal open={open} onOpenChange={setOpen} eventId={eventId} featureLabel={featureLabel} />
    </div>
  )
}
