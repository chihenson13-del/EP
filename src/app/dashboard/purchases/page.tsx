import Link from "next/link"
import { requireUser } from "@/lib/session"
import { listMyPurchases } from "@/actions/payments"
import { formatPHP } from "@/lib/entitlements"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RestoreButton } from "@/components/payments/restore-button"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  PENDING: "secondary",
  SUBMITTED: "secondary",
  UNDER_REVIEW: "secondary",
  REJECTED: "destructive",
  FAILED: "destructive",
  CANCELLED: "outline",
}

export default async function PurchasesPage() {
  await requireUser()
  const purchases = await listMyPurchases()

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">My Purchases</h1>
          <p className="text-muted-foreground text-sm mt-1">Your payment history and access status.</p>
        </div>
        <RestoreButton />
      </div>

      <div className="rounded-xl border border-border/70 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No purchases yet.</TableCell></TableRow>
            )}
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{p.plan.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.event?.name ?? "Account-wide"}</TableCell>
                <TableCell className="text-sm">{formatPHP(p.amount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.paymentReference}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  {p.status === "REJECTED" && p.rejectedReason && (
                    <p className="text-xs text-destructive mt-1 max-w-[200px]">{p.rejectedReason}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.approvedAt ? new Date(p.approvedAt).toLocaleDateString() : "—"}</TableCell>
                <TableCell>
                  {p.status === "REJECTED" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/checkout?plan=${p.plan.key}${p.event ? `&eventId=${p.event.id}` : ""}`}>Pay again</Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
