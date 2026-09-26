"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type QuickAction = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  hint?: string
  /** Ask "tap again to confirm" before running (e.g. delete). */
  confirm?: string
}

/**
 * The menu that opens when a guest's name is pressed and held (or right-clicked): details, actions, and
 * "Select" to start choosing several guests. A bottom sheet with large rows, so it's easy to use one-handed.
 */
export function GuestQuickActions({ open, onOpenChange, title, subtitle, actions }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; subtitle?: React.ReactNode; actions: QuickAction[] }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setConfirming(null); onOpenChange(o) }}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md">
          <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
          <SheetHeader className="text-left">
            <SheetTitle className="font-heading text-lg break-words pr-6">{title}</SheetTitle>
            {subtitle ? <SheetDescription asChild><div>{subtitle}</div></SheetDescription> : <SheetDescription className="sr-only">Guest actions</SheetDescription>}
          </SheetHeader>
          <ul className="px-2 pb-2">
            {actions.map((a) => {
              const Icon = a.icon
              const asking = confirming === a.key
              return (
                <li key={a.key}>
                  <button
                    type="button"
                    disabled={a.disabled}
                    onClick={() => {
                      if (a.confirm && !asking) return setConfirming(a.key)
                      setConfirming(null)
                      onOpenChange(false)
                      a.onSelect()
                    }}
                    className={cn(
                      "flex w-full min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[0.95rem] transition-colors cursor-pointer hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
                      a.destructive && "text-destructive",
                      asking && "bg-destructive/10",
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium">{asking ? a.confirm : a.label}</span>
                      {a.hint && !asking && <span className="block text-xs text-muted-foreground">{a.hint}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export type BulkAction = { key: string; label: string; onSelect: () => void; destructive?: boolean; confirm?: string }

/**
 * Bar pinned to the bottom of the screen while guests are selected: how many, select all / clear, and the
 * actions that apply to all of them. Wraps onto two lines on narrow phones instead of scrolling sideways.
 */
export function SelectionBar({ count, total, onSelectAll, onDone, actions, pending }: { count: number; total: number; onSelectAll: () => void; onDone: () => void; actions: BulkAction[]; pending: boolean }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)]" role="region" aria-label="Selected guests">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="size-9 shrink-0" onClick={() => { setConfirming(null); onDone() }} aria-label="Stop selecting"><X className="size-5" /></Button>
          <p className="flex-1 min-w-0 text-sm font-semibold">{count} selected</p>
          <Button size="sm" variant="ghost" onClick={onSelectAll} disabled={count === total}><Check className="size-4" /> Select all ({total})</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const asking = confirming === a.key
            return (
              <Button
                key={a.key}
                size="sm"
                variant={a.destructive ? (asking ? "destructive" : "outline") : "outline"}
                className={cn("flex-1 min-w-[9rem]", a.destructive && !asking && "text-destructive")}
                disabled={pending || count === 0}
                onClick={() => {
                  if (a.confirm && !asking) return setConfirming(a.key)
                  setConfirming(null)
                  a.onSelect()
                }}
              >
                {asking ? a.confirm : a.label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Round tick shown on a guest card while selecting. */
export function SelectTick({ checked }: { checked: boolean }) {
  return (
    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-background")} aria-hidden>
      {checked && <Check className="size-3.5" />}
    </span>
  )
}
