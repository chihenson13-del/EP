"use client"

import { useState } from "react"
import { toast } from "sonner"
import { inviteCollaborator, updateCollaboratorRole, revokeCollaborator, transferOwnership } from "@/actions/collaboration"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UpgradeModal } from "@/components/payments/upgrade-modal"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { CollaboratorRole, CollaboratorStatus } from "@prisma/client"

type Collaborator = { id: string; invitedEmail: string; role: CollaboratorRole; status: CollaboratorStatus; user: { id: string; name: string | null } | null }

export function TeamManager({ eventId, collaborators, canCollaborate }: { eventId: string; collaborators: Collaborator[]; canCollaborate: boolean }) {
  const [list, setList] = useState(collaborators)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<CollaboratorRole>("CLIENT")
  const [loading, setLoading] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<Collaborator | null>(null)

  async function invite() {
    if (!canCollaborate) return setUpgradeOpen(true)
    if (!email.trim()) return toast.error("Enter an email address.")
    setLoading(true)
    const result = await inviteCollaborator(eventId, email, role)
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Invitation sent.")
    setList((prev) => [{ id: result.data.id, invitedEmail: email, role, status: "INVITED", user: null }, ...prev])
    setEmail("")
  }

  async function changeRole(id: string, next: CollaboratorRole) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, role: next } : c)))
    await updateCollaboratorRole(eventId, id, next)
  }

  async function revoke(id: string) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, status: "REVOKED" } : c)))
    await revokeCollaborator(eventId, id)
  }

  async function handleTransfer() {
    if (!transferTarget?.user) return
    const result = await transferOwnership(eventId, transferTarget.user.id)
    setTransferTarget(null)
    if (!result.ok) return toast.error(result.error)
    toast.success("Ownership transferred. You've been kept on as coordinator.")
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Invite someone</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="COORDINATOR">Coordinator</SelectItem>
              <SelectItem value="CLIENT">Client</SelectItem>
              <SelectItem value="VIEWER">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={invite} disabled={loading}>Invite</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Access</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.filter((c) => c.status !== "REVOKED").length === 0 && <p className="text-sm text-muted-foreground">No collaborators yet.</p>}
          {list.filter((c) => c.status !== "REVOKED").map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.user?.name ?? c.invitedEmail}</p>
                <p className="text-xs text-muted-foreground">{c.invitedEmail} · <Badge variant="outline" className="text-[10px]">{c.status}</Badge></p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={c.role} onValueChange={(v) => changeRole(c.id, v as CollaboratorRole)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                {c.user && c.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" onClick={() => setTransferTarget(c)}>Make owner</Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(c.id)}>Revoke</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} eventId={eventId} featureLabel="Client collaboration" />

      <AlertDialog open={!!transferTarget} onOpenChange={(o) => !o && setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership to {transferTarget?.user?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They become the event owner. You&apos;ll automatically be kept on as a Coordinator so you retain management access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer}>Transfer ownership</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
