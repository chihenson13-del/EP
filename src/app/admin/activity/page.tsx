import { formatDateTime } from "@/lib/timezone"
import { requireAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminActivityPage() {
  await requireAdmin()
  const logs = await db.activityLog.findMany({
    relationLoadStrategy: "join",
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Activity Log</h1>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No activity yet.</TableCell></TableRow>}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                <TableCell className="text-sm">{log.actor?.name ?? "System"}</TableCell>
                <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.targetType} · {log.targetId?.slice(0, 8)}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{JSON.stringify(log.metadata)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
