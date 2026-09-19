import Link from "next/link"
import { CalendarDays, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CalendarLockedCard() {
  return (
    <Card className="p-10 sm:p-14 text-center space-y-5 border-border/70 bg-card">
      <div className="mx-auto size-14 rounded-full bg-accent/40 text-primary flex items-center justify-center">
        <CalendarDays className="size-7" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Lock className="size-3.5" /> Locked
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">Booking Calendar</h1>
        <p className="text-muted-foreground max-w-md mx-auto">Available with Unlimited</p>
      </div>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        See every one of your events on one editorial calendar — month, week, day, and agenda views, with real
        booking details, conflict detection, and calendar export. Unlocks once your Unlimited payment is approved.
      </p>
      <Button size="lg" asChild>
        <Link href="/checkout?plan=UNLIMITED">Upgrade to Unlimited</Link>
      </Button>
    </Card>
  )
}
