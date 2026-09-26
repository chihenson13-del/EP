"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Copy, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getGuestMessengerEligibility, sendMessengerMessage } from "@/actions/messenger"
import { safe } from "@/lib/safe-action"
import type { Eligibility } from "@/lib/messenger/meta-messenger-service"

const TEXT_LIMIT = 2000

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * "Official Messenger" row in Guest Details. While the integration is off it only says "Messenger unavailable".
 * When it's on, it shows Meta-based eligibility, and the composer appears only for an eligible guest.
 * "Sent" is shown only after Meta returned a message ID.
 */
export function OfficialMessengerPanel({ live, eventId, guestId, guestName }: { live: boolean; eventId: string; guestId: string; guestName: string }) {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null)
  const [text, setText] = useState("")
  const [status, setStatus] = useState<"DRAFT" | "SENDING" | "SENT" | "FAILED">("DRAFT")
  const [pending, startTransition] = useTransition()
  const key = useRef(newKey())

  useEffect(() => {
    if (!live) return
    let cancelled = false
    safe(getGuestMessengerEligibility(eventId, guestId)).then((r) => { if (!cancelled && r.ok) setEligibility(r.data) })
    return () => { cancelled = true }
  }, [live, eventId, guestId])

  if (!live) {
    return (
      <div className="flex items-center justify-between gap-3 p-3">
        <span className="text-sm text-muted-foreground">Official Messenger</span>
        <span className="text-sm text-muted-foreground">Messenger unavailable</span>
      </div>
    )
  }

  function send() {
    setStatus("SENDING")
    startTransition(async () => {
      const result = await safe(sendMessengerMessage({ eventId, guestId, text, idempotencyKey: key.current }))
      if (!result.ok) {
        setStatus("FAILED")
        toast.error(result.error)
        return
      }
      setStatus("SENT")
      setText("")
      key.current = newKey()
      toast.success(`Meta accepted the message to ${guestName}.`)
    })
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Official Messenger</span>
        <Badge variant={eligibility?.status === "ELIGIBLE" ? "default" : "outline"}>{eligibility?.label ?? "Checking…"}</Badge>
      </div>
      {eligibility && <p className="text-xs text-muted-foreground">{eligibility.status === "ELIGIBLE" ? "Message eligibility: the guest messaged your Page in the last 24 hours." : eligibility.reason}</p>}

      {eligibility?.status === "NEEDS_GUEST_INTERACTION" && (
        <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(eligibility.optInUrl).then(() => toast.success("Messenger link copied. Send it to the guest."), () => toast.error("Couldn't copy the link."))}>
          <Copy className="size-3.5" /> Copy guest&apos;s Messenger link
        </Button>
      )}

      {eligibility?.status === "ELIGIBLE" && (
        <div className="space-y-2">
          <p className="text-xs">Send Messenger Message — Recipient: <strong>{guestName}</strong></p>
          <Textarea rows={3} maxLength={TEXT_LIMIT} value={text} onChange={(e) => { setText(e.target.value); if (status !== "SENDING") setStatus("DRAFT") }} placeholder="Message" aria-label="Messenger message" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Replies are allowed until {new Date(eligibility.windowEndsAt).toLocaleString()}. Follow Meta&apos;s messaging policies.</span>
            <span>{text.length}/{TEXT_LIMIT}</span>
          </div>
          <Button type="button" size="sm" className="w-full" onClick={send} disabled={pending || !text.trim()}>
            <Send className="size-3.5" /> {status === "SENDING" ? "Sending…" : "Send"}
          </Button>
          {status === "SENT" && <p className="text-xs text-primary">Sent — Meta confirmed the message.</p>}
          {status === "FAILED" && <p className="text-xs text-destructive">Failed — the message was not sent.</p>}
        </div>
      )}
    </div>
  )
}
