"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, X, FlaskConical, Gift } from "lucide-react"
import { approvePurchase, rejectPurchase, simulateTestPayment } from "@/actions/admin"
import { formatPHP } from "@/lib/entitlements"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { GrantEntitlementDialog } from "@/components/admin/grant-entitlement-dialog"

type Purchase = {
  id: string
  amount: number
  paymentReference: string | null
  paymentMethod: string | null
  proofImageUrl: string | null
  status: "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "FAILED" | "CANCELLED"
  createdAt: string
  user: { name: string | null; email: string }
  plan: { name: string; key: string }
  event: { id: string; name: string } | null
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default", PENDING: "secondary", SUBMITTED: "secondary", UNDER_REVIEW: "secondary", REJECTED: "destructive", FAILED: "destructive", CANCELLED: "outline",
}

export function PaymentsQueue({
  purchases, users, events,
}: { purchases: Purchase[]; users: { id: string; name: string | null; email: string }[]; events: { id: string; name: string; ownerId: string }[] }) {
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW")
  const [pending, startTransition] = useTransition()
  const [rejecting, setRejecting] = useState<Purchase | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [grantOpen, setGrantOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [viewingProof, setViewingProof] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return purchases
    if (statusFilter === "PENDING_REVIEW") return purchases.filter((p) => ["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(p.status))
    return purchases.filter((p) => p.status === statusFilter)
  }, [purchases, statusFilter])

  function handleApprove(id: string) {
    startTransition(async () => {
      const result = await approvePurchase(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Approved. Entitlement activated.")
    })
  }

  function handleReject() {
    if (!rejecting) return
    startTransition(async () => {
      const result = await rejectPurchase(rejecting.id, rejectReason || "No reason given")
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Rejected.")
      setRejecting(null)
      setRejectReason("")
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING_REVIEW">Pending review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setGrantOpen(true)}><Gift className="size-4" /> Manual grant</Button>
        {process.env.NODE_ENV !== "production" && (
          <Button variant="outline" onClick={() => setTestOpen(true)}><FlaskConical className="size-4" /> Test payment mode</Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-10">Nothing here.</TableCell></TableRow>}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm">
                  <div className="font-medium">{p.user.name}</div>
                  <div className="text-muted-foreground text-xs">{p.user.email}</div>
                </TableCell>
                <TableCell><Badge variant="outline">{p.plan.name}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.event?.name ?? "Account-wide"}</TableCell>
                <TableCell className="text-sm">{formatPHP(p.amount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.paymentMethod}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.paymentReference}</TableCell>
                <TableCell>
                  {p.proofImageUrl ? (
                    <button onClick={() => setViewingProof(p.proofImageUrl)} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.proofImageUrl} alt="Payment proof" className="size-10 rounded object-cover border border-border/70 hover:opacity-80 transition-opacity" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></TableCell>
                <TableCell>
                  {["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(p.status) && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" className="size-7" disabled={pending} onClick={() => handleApprove(p.id)}>
                        <Check className="size-3.5 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="outline" className="size-7" disabled={pending} onClick={() => setRejecting(p)}>
                        <X className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason (shown to the customer)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="destructive" onClick={handleReject} disabled={pending}>Reject payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GrantEntitlementDialog open={grantOpen} onOpenChange={setGrantOpen} users={users} events={events} />
      {process.env.NODE_ENV !== "production" && <TestPaymentDialog open={testOpen} onOpenChange={setTestOpen} users={users} events={events} />}

      <Dialog open={!!viewingProof} onOpenChange={(o) => !o && setViewingProof(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Payment proof</DialogTitle></DialogHeader>
          {viewingProof && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewingProof} alt="Payment proof" className="w-full rounded-lg border border-border/70" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TestPaymentDialog({
  open, onOpenChange, users, events,
}: { open: boolean; onOpenChange: (o: boolean) => void; users: { id: string; name: string | null; email: string }[]; events: { id: string; name: string; ownerId: string }[] }) {
  const [userId, setUserId] = useState("")
  const [planKey, setPlanKey] = useState<"PREMIUM" | "PRO" | "UNLIMITED">("PREMIUM")
  const [eventId, setEventId] = useState("")
  const [pending, startTransition] = useTransition()

  const userEvents = events.filter((e) => e.ownerId === userId)

  function run(outcome: "PENDING" | "APPROVED" | "REJECTED" | "FAILED") {
    if (!userId) {
        toast.error("Select a user.")
        return
      }
    startTransition(async () => {
      const result = await simulateTestPayment(userId, planKey, planKey === "UNLIMITED" ? undefined : eventId || undefined, outcome)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Simulated ${outcome} payment.`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Test payment mode</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Admin-only. Simulates a purchase in any status without a real payment.</p>
        <div className="space-y-3">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}</SelectContent>
          </Select>
          <Select value={planKey} onValueChange={(v) => setPlanKey(v as typeof planKey)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PREMIUM">Premium</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="UNLIMITED">Unlimited</SelectItem>
            </SelectContent>
          </Select>
          {planKey !== "UNLIMITED" && (
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>{userEvents.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run("PENDING")}>Simulate Pending</Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run("APPROVED")}>Simulate Approved</Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run("REJECTED")}>Simulate Rejected</Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run("FAILED")}>Simulate Failed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
