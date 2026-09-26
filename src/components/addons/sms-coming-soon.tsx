"use client"

import { useState } from "react"
import { MessageSquareText, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SMS_ADDON, SMS_COMING_SOON_DETAIL } from "@/lib/addons"

/** The small, elegant badge used everywhere SMS appears while it's paused. */
export function ComingSoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${className}`}
      style={{ borderColor: "var(--brand-purple-pastel)", background: "var(--brand-lavender)", color: "var(--brand-purple-deep)" }}
    >
      <Sparkles className="size-3" aria-hidden /> Coming soon
    </span>
  )
}

/** Informational dialog only: it never sends, schedules or charges anything. */
export function SmsComingSoonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1"><ComingSoonBadge /></div>
          <DialogTitle className="font-heading">{SMS_ADDON.name} — Coming Soon</DialogTitle>
          <DialogDescription>{SMS_COMING_SOON_DETAIL}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The SMS Invitations card: title, Coming Soon badge, what it will do, and the cost disclosure. The only button
 * opens the informational dialog above.
 */
export function SmsComingSoonCard({ compact = false, showButton = true }: { compact?: boolean; showButton?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`rounded-2xl border ${compact ? "p-4" : "p-6"} space-y-3`}
      style={{ borderColor: "var(--brand-beige)", background: "linear-gradient(160deg, var(--brand-ivory), var(--brand-cream))" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--brand-lavender)", color: "var(--brand-purple-deep)" }}>
            <MessageSquareText className="size-4" aria-hidden />
          </span>
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand-plum)" }}>{SMS_ADDON.name}</p>
        </div>
        <ComingSoonBadge />
      </div>
      <p className="text-sm" style={{ color: "var(--brand-plum)" }}>{SMS_ADDON.description}</p>
      <p className="text-xs font-medium" style={{ color: "var(--brand-purple-deep)" }}>Optional paid add-on. {SMS_ADDON.costNote}</p>
      {showButton && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">Coming Soon</Button>
          <SmsComingSoonDialog open={open} onOpenChange={setOpen} />
        </>
      )}
    </div>
  )
}
