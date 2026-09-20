import { formatDate } from "@/lib/timezone"
import { requireAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { getEventTypeConfig } from "@/lib/event-types"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminEventsPage() {
  await requireAdmin()
  const events = await db.event.findMany({
    relationLoadStrategy: "join",
    include: { owner: { select: { name: true, email: true } }, _count: { select: { guests: true } }, entitlements: { where: { status: "ACTIVE" }, include: { plan: true }, take: 1, orderBy: { activatedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Events</h1>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{getEventTypeConfig(e.type).label}</TableCell>
                <TableCell className="text-sm">{e.owner.name}</TableCell>
                <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                <TableCell>{e._count.guests}</TableCell>
                <TableCell><Badge variant="outline">{e.entitlements[0]?.plan.name ?? "Free"}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
