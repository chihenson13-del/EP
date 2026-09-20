import { formatDate } from "@/lib/timezone"
import { requireAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminUsersPage() {
  await requireAdmin()
  const users = await db.user.findMany({
    relationLoadStrategy: "join",
    include: {
      _count: { select: { events: true, purchases: true } },
      entitlements: { where: { status: "ACTIVE" }, include: { plan: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Users</h1>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Purchases</TableHead>
              <TableHead>Active entitlements</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant={u.role === "ADMIN" ? "default" : "outline"}>{u.role}</Badge></TableCell>
                <TableCell>{u._count.events}</TableCell>
                <TableCell>{u._count.purchases}</TableCell>
                <TableCell className="space-x-1">
                  {u.entitlements.length === 0 ? <span className="text-muted-foreground text-sm">—</span> : u.entitlements.map((e) => <Badge key={e.id} variant="outline">{e.plan.name}</Badge>)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
