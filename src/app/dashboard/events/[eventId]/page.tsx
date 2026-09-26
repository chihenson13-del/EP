import { formatDate } from "@/lib/timezone"
import Link from "next/link"
import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { getEventTypeConfig } from "@/lib/event-types"
import { getEffectivePlan } from "@/lib/entitlements"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PublishToggle } from "@/components/events/publish-toggle"
import { QrCodeCard } from "@/components/events/qr-code-card"
import { Users, CheckCircle2, Clock, XCircle, HelpCircle } from "lucide-react"

export default async function EventOverviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user, event } = await getEventContext(eventId)

  const [statusCounts, plan] = await Promise.all([
    db.guest.groupBy({ by: ["rsvpStatus"], where: { eventId }, _count: { _all: true } }),
    getEffectivePlan(user.id, eventId),
  ])

  const counts = { PENDING: 0, ATTENDING: 0, DECLINED: 0, MAYBE: 0 }
  for (const s of statusCounts) counts[s.rsvpStatus] = s._count._all
  const total = counts.PENDING + counts.ATTENDING + counts.DECLINED + counts.MAYBE
  const typeConfig = getEventTypeConfig(event.type)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>{typeConfig.emoji}</span>
            <span>{typeConfig.label}</span>
            <Badge variant="outline">{plan}</Badge>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{event.name}</h1>
          {event.date && (
            <p className="text-muted-foreground text-sm mt-1">
              {formatDate(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {event.timeLabel ? ` · ${event.timeLabel}` : ""}
              {event.venueName ? ` · ${event.venueName}` : ""}
            </p>
          )}
        </div>
        <PublishToggle eventId={event.id} status={event.status} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total guests" value={total} />
        <StatCard icon={CheckCircle2} label="Attending" value={counts.ATTENDING} tone="text-emerald-600" />
        <StatCard icon={XCircle} label="Declined" value={counts.DECLINED} tone="text-destructive" />
        <StatCard icon={Clock} label="Pending" value={counts.PENDING} tone="text-amber-600" />
      </div>
      <p className="-mt-2 text-sm"><Link href={`/dashboard/events/${event.id}/rsvps`} className="font-medium text-primary hover:underline">View every guest&apos;s RSVP response →</Link></p>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {typeConfig.checklist.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild className="justify-start"><Link href={`/dashboard/events/${event.id}/guests`}>Manage guests</Link></Button>
            <Button variant="outline" asChild className="justify-start"><Link href={`/dashboard/events/${event.id}/seating`}>Seating plan</Link></Button>
            <Button variant="outline" asChild className="justify-start"><Link href={`/dashboard/events/${event.id}/website`}>Edit website</Link></Button>
            <Button variant="outline" asChild className="justify-start"><Link href={`/dashboard/events/${event.id}/messaging`}>Send invites</Link></Button>
            <Button variant="outline" asChild className="justify-start"><Link href={`/dashboard/events/${event.id}/checkin`}>Event-day check-in</Link></Button>
            <Button variant="outline" asChild className="justify-start"><Link href={`/dashboard/events/${event.id}/analytics`}>View analytics</Link></Button>
          </CardContent>
        </Card>

        <QrCodeCard url={`${process.env.NEXT_PUBLIC_APP_URL}/e/${event.slug}`} />
      </div>

      {counts.MAYBE > 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5"><HelpCircle className="size-4" /> {counts.MAYBE} guests responded &quot;maybe&quot;.</p>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone?: string }) {
  return (
    <Card className="p-4">
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${tone ?? ""}`}>
        <Icon className="size-4" />
        {label}
      </div>
      <div className="font-heading text-2xl font-bold mt-1">{value}</div>
    </Card>
  )
}
