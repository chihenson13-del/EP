"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { grantEntitlementManually } from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function GrantEntitlementDialog({
  open, onOpenChange, users, events,
}: { open: boolean; onOpenChange: (o: boolean) => void; users: { id: string; name: string | null; email: string }[]; events: { id: string; name: string; ownerId: string }[] }) {
  const [userId, setUserId] = useState("")
  const [planKey, setPlanKey] = useState<"PREMIUM" | "PRO" | "UNLIMITED">("PREMIUM")
  const [eventId, setEventId] = useState("")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()

  const userEvents = events.filter((e) => e.ownerId === userId)

  function submit() {
    if (!userId || !reason.trim()) {
      toast.error("Select a user and provide a reason.")
      return
    }
    startTransition(async () => {
      const result = await grantEntitlementManually({ userId, planKey, eventId: planKey === "UNLIMITED" ? undefined : eventId, reason })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Entitlement granted.")
      onOpenChange(false)
      setReason("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manually grant access</DialogTitle>
          <DialogDescription>Bypasses payment. Requires a reason — logged to the activity log with your identity and timestamp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}</SelectContent>
          </Select>
          <Select value={planKey} onValueChange={(v) => setPlanKey(v as typeof planKey)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PREMIUM">Premium (event)</SelectItem>
              <SelectItem value="PRO">Pro (event)</SelectItem>
              <SelectItem value="UNLIMITED">Unlimited (account)</SelectItem>
            </SelectContent>
          </Select>
          {planKey !== "UNLIMITED" && (
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>{userEvents.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Textarea placeholder="Reason for granting access" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>Grant access</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
