"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CheckCircle2, ScanLine, Upload } from "lucide-react"
import { submitPurchase } from "@/actions/payments"
import { formatPHP } from "@/lib/entitlements"
import { ImageUpload } from "@/components/shared/image-upload"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { PlanKey } from "@prisma/client"

const PAYMENT_METHODS = ["GCash", "Maya", "MariBank / InstaPay", "Bank Transfer", "Credit/Debit Card", "Over-the-counter"]

type Settings = { paymentQrImageUrl: string | null; paymentAccountName: string | null; paymentAccountInfo: string | null; paymentInstructions: string | null } | null

export function CheckoutForm({
  plan, planLabel, amount, event, user, settings,
}: {
  plan: PlanKey
  planLabel: string
  amount: number
  event: { id: string; name: string; slug: string } | null
  user: { name: string; email: string }
  settings: Settings
}) {
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [proofImageUrl, setProofImageUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (!paymentMethod) {
      toast.error("Select the payment method you used.")
      return
    }
    if (!paymentReference.trim()) {
      toast.error("Enter your payment reference number.")
      return
    }
    setLoading(true)
    const result = await submitPurchase({
      planKey: plan as "PREMIUM" | "PRO" | "UNLIMITED",
      eventId: event?.id,
      paymentMethod,
      paymentReference,
      proofImageUrl,
    })
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-10 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent/40 text-primary">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="font-heading text-2xl font-semibold">Payment submitted</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your payment has been submitted and is awaiting approval. We&apos;ll email you as soon as it&apos;s reviewed —
            your {planLabel} features stay locked until then.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/purchases">View purchase status</Link>
            </Button>
            <Button asChild>
              <Link href={event ? `/dashboard/events/${event.id}` : "/dashboard"}>Back to {event ? "event" : "dashboard"}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card className="border-border/70">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-heading text-xl font-semibold">{planLabel}</p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-accent/30">
              {plan === "UNLIMITED" ? "Whole account" : "This event"}
            </Badge>
          </div>
          <div className="rounded-lg bg-secondary/60 p-4">
            <p className="text-sm text-muted-foreground">Amount to pay</p>
            <p className="font-heading text-3xl font-semibold">{formatPHP(amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">One-time payment — not a subscription.</p>
          </div>
          {event && (
            <div className="text-sm">
              <p className="text-muted-foreground">Event being unlocked</p>
              <p className="font-medium">{event.name}</p>
            </div>
          )}

          <div className="border-t border-border/70 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ScanLine className="size-4 text-primary" /> Scan to pay
            </div>
            {settings?.paymentQrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.paymentQrImageUrl}
                alt="Scan this QR code to pay"
                className="w-56 mx-auto rounded-xl border border-border/70 bg-white p-2"
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Payment QR not yet configured. An admin can add it in Admin → Settings.
              </p>
            )}
            {(settings?.paymentAccountName || settings?.paymentAccountInfo) && (
              <div className="text-center text-sm">
                {settings.paymentAccountName && <p className="font-medium">{settings.paymentAccountName}</p>}
                {settings.paymentAccountInfo && <p className="text-muted-foreground">{settings.paymentAccountInfo}</p>}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {settings?.paymentInstructions || "Scan the QR code with your banking or e-wallet app, then upload your proof of payment."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer name</Label>
              <Input value={user.name} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Customer email</Label>
              <Input value={user.email} disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment method used</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a method" /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Payment reference number</Label>
            <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Found in your payment app's receipt" />
          </div>

          <div className="space-y-1.5">
            <Label>Payment proof</Label>
            {proofImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofImageUrl} alt="Payment proof" className="w-full max-h-48 object-contain rounded-lg border border-border/70 mb-2" />
            )}
            <ImageUpload onUploaded={setProofImageUrl} label={proofImageUrl ? "Replace proof" : "Upload Payment Proof"} />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
            <Upload className="size-4" /> {loading ? "Submitting..." : "Submit Payment for Verification"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Your payment status is: <strong>Pending review</strong>. Paid features unlock only after an admin approves it.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
