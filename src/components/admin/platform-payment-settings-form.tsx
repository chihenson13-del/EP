"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updatePlatformPaymentSettings } from "@/actions/platform-settings"
import { ImageUpload } from "@/components/shared/image-upload"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

import { safe } from "@/lib/safe-action"
type Settings = {
  paymentQrImageUrl: string | null
  paymentAccountName: string | null
  paymentAccountInfo: string | null
  paymentInstructions: string | null
} | null

export function PlatformPaymentSettingsForm({ settings }: { settings: Settings }) {
  // The current QR is shown from its cached URL; a data URL only exists here after the admin picks a new file.
  const [newQr, setNewQr] = useState<string | null>(null)
  const qrUrl = newQr ?? settings?.paymentQrImageUrl ?? ""
  const [accountName, setAccountName] = useState(settings?.paymentAccountName ?? "")
  const [accountInfo, setAccountInfo] = useState(settings?.paymentAccountInfo ?? "")
  const [instructions, setInstructions] = useState(settings?.paymentInstructions ?? "")
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const result = await safe(updatePlatformPaymentSettings({
      // Omitted unless replaced, so saving text edits never re-uploads (or touches) the existing image.
      ...(newQr ? { paymentQrImageUrl: newQr } : {}),
      paymentAccountName: accountName,
      paymentAccountInfo: accountInfo,
      paymentInstructions: instructions,
    }))
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setNewQr(null)
    toast.success("Payment settings saved.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Payment QR</CardTitle>
        <CardDescription>This is shown to every customer at checkout for Premium, Pro, and Unlimited purchases.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Payment QR code</Label>
          {qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="Payment QR code" className="w-48 rounded-lg border" />
          )}
          <ImageUpload onUploaded={setNewQr} compress={false} label={qrUrl ? "Replace QR image" : "Upload QR image"} />
          <p className="text-xs text-muted-foreground">Upload the exact QR image from your payment app — it is displayed as-is, never modified.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Account name</Label>
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Juan Dela Cruz" />
        </div>
        <div className="space-y-1.5">
          <Label>Account info</Label>
          <Input value={accountInfo} onChange={(e) => setAccountInfo(e.target.value)} placeholder="e.g. GCash (****1234)" />
        </div>
        <div className="space-y-1.5">
          <Label>Instructions for customers</Label>
          <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Scan the QR with your banking or e-wallet app, then upload proof of payment below." />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save payment settings"}</Button>
      </CardContent>
    </Card>
  )
}
