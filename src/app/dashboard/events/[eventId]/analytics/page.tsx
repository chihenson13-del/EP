import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportButtons } from "@/components/events/export-buttons"

export default async function AnalyticsPage({ params }: { params: Promise<{ eventId: string }> }) {
  await requireUser()
  const { eventId } = await params
  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) notFound()

  const [statusCounts, guests, messageLogCounts] = await Promise.all([
    db.guest.groupBy({ by: ["rsvpStatus"], where: { eventId }, _count: { _all: true } }),
    db.guest.findMany({ where: { eventId }, select: { category: true, rsvpStatus: true, plusOnes: true, checkedIn: true, numberAttending: true } }),
    db.messageLog.groupBy({ by: ["status"], where: { eventId }, _count: { _all: true } }),
  ])

  const counts = { PENDING: 0, ATTENDING: 0, DECLINED: 0, MAYBE: 0 }
  for (const s of statusCounts) counts[s.rsvpStatus] = s._count._all
  const total = guests.length
  const responded = counts.ATTENDING + counts.DECLINED + counts.MAYBE
  const responseRate = total ? Math.round((responded / total) * 100) : 0
  const plusOneCount = guests.reduce((sum, g) => sum + g.plusOnes.length, 0)
  const expectedAttendees = guests.reduce((sum, g) => sum + (g.rsvpStatus === "ATTENDING" ? (g.numberAttending || 1) : 0), 0)
  const checkedInCount = guests.filter((g) => g.checkedIn).length

  const byCategory = new Map<string, { total: number; attending: number }>()
  for (const g of guests) {
    const key = g.category || "Uncategorized"
    const entry = byCategory.get(key) ?? { total: 0, attending: 0 }
    entry.total++
    if (g.rsvpStatus === "ATTENDING") entry.attending++
    byCategory.set(key, entry)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Live RSVP and engagement data.</p>
        </div>
        <ExportButtons eventId={eventId} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total guests" value={total} />
        <Stat label="Response rate" value={`${responseRate}%`} />
        <Stat label="Expected attendees" value={expectedAttendees} />
        <Stat label="Plus-ones" value={plusOneCount} />
        <Stat label="Confirmed" value={counts.ATTENDING} tone="text-emerald-600" />
        <Stat label="Declined" value={counts.DECLINED} tone="text-destructive" />
        <Stat label="Pending" value={counts.PENDING} tone="text-amber-600" />
        <Stat label="Checked in" value={checkedInCount} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">RSVP breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Bar label="Attending" value={counts.ATTENDING} total={total} color="bg-emerald-500" />
            <Bar label="Declined" value={counts.DECLINED} total={total} color="bg-destructive" />
            <Bar label="Maybe" value={counts.MAYBE} total={total} color="bg-amber-500" />
            <Bar label="Pending" value={counts.PENDING} total={total} color="bg-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[...byCategory.entries()].map(([cat, data]) => (
              <Bar key={cat} label={cat} value={data.attending} total={data.total} color="bg-primary" suffix={`${data.attending}/${data.total}`} />
            ))}
            {byCategory.size === 0 && <p className="text-sm text-muted-foreground">No guests yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Invitation activity</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          {messageLogCounts.length === 0 && <p className="text-muted-foreground">No messages sent yet.</p>}
          {messageLogCounts.map((m) => (
            <div key={m.status} className="rounded-lg bg-secondary/50 px-3 py-2">
              <span className="font-medium">{m._count._all}</span> <span className="text-muted-foreground">{m.status.toLowerCase().replace("_", " ")}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card className="p-4">
      <p className={`text-sm text-muted-foreground ${tone ?? ""}`}>{label}</p>
      <p className="font-heading text-2xl font-bold mt-1">{value}</p>
    </Card>
  )
}

function Bar({ label, value, total, color, suffix }: { label: string; value: number; total: number; color: string; suffix?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">{suffix ?? `${value} (${pct}%)`}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
