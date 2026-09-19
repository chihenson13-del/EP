import Link from "next/link"
import { format } from "date-fns"
import { CalendarDays, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type PreviewEvent = { id: string; name: string; date: string; timeLabel: string | null }

export function BookingCalendarCard({ unlimited, upcoming }: { unlimited: boolean; upcoming: PreviewEvent[] }) {
  if (!unlimited) {
    return (
      <Card className="p-5 space-y-3 border-border/70 bg-secondary/30">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Booking Calendar</h3>
        </div>
        <p className="text-sm text-muted-foreground">Manage unlimited bookings with Unlimited.</p>
        <Button size="sm" variant="outline" asChild>
          <Link href="/checkout?plan=UNLIMITED">View Unlimited</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="p-5 space-y-3 border-border/70">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm">Booking Calendar</h3>
      </div>
      <p className="text-sm text-muted-foreground">Your events, all in one place.</p>
      {upcoming.length > 0 ? (
        <div className="space-y-1.5">
          {upcoming.map((e) => (
            <div key={e.id} className="text-xs flex items-baseline gap-2">
              <span className="text-muted-foreground shrink-0">{format(new Date(e.date), "MMM d")}</span>
              <span className="truncate font-medium">{e.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No upcoming bookings yet.</p>
      )}
      <Button size="sm" variant="outline" className="w-full" asChild>
        <Link href="/dashboard/calendar">Open Calendar <ArrowRight className="size-3.5" /></Link>
      </Button>
    </Card>
  )
}
