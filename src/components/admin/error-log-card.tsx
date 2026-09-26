"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, BellRing, CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { safe } from "@/lib/safe-action"
import { markAllErrorsFixed, markErrorFixed, refreshErrorLog, sendTestErrorAlert } from "@/actions/error-log"
import type { AppErrorRow } from "@/lib/error-alerts"
import { cn } from "@/lib/utils"

function ago(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

/** Admin → Settings: what broke on the live site recently, and whether alert emails reach the admins. */
export function ErrorLogCard({ initial, recipients, emailLive }: { initial: AppErrorRow[] | null; recipients: string[]; emailLive: boolean }) {
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const openCount = rows?.filter((r) => !r.resolved).length ?? 0

  function refresh() {
    startTransition(async () => {
      const result = await safe(refreshErrorLog())
      if (!result.ok) { toast.error(result.error); return }
      setRows(result.data)
    })
  }
  function fix(id: string) {
    startTransition(async () => {
      const result = await safe(markErrorFixed(id))
      if (!result.ok) { toast.error(result.error); return }
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, resolved: true } : r)) ?? prev)
    })
  }
  function fixAll() {
    startTransition(async () => {
      const result = await safe(markAllErrorsFixed())
      if (!result.ok) { toast.error(result.error); return }
      setRows((prev) => prev?.map((r) => ({ ...r, resolved: true })) ?? prev)
    })
  }
  function test() {
    startTransition(async () => {
      const result = await safe(sendTestErrorAlert())
      if (!result.ok) { toast.error(result.error); return }
      toast.success(result.data.mock ? "Test recorded — but email is in test mode (no RESEND_API_KEY), so nothing was delivered." : `Test alert sent to ${result.data.recipients} admin email${result.data.recipients === 1 ? "" : "s"}. Check your inbox (and spam).`)
      const fresh = await safe(refreshErrorLog())
      if (fresh.ok) setRows(fresh.data)
    })
  }

  return (
    <div id="errors" className="rounded-xl border bg-card p-5 space-y-3 scroll-mt-20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-primary" aria-hidden />
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.14em]">Error alerts</p>
        </div>
        <Button size="icon" variant="ghost" className="size-8" onClick={refresh} disabled={pending || !rows} aria-label="Refresh"><RefreshCw className={cn("size-4", pending && "animate-spin")} /></Button>
      </div>
      <p className="text-sm text-muted-foreground">
        If a page, RSVP or button fails on the live site, it shows up here and {recipients.length ? <>an email goes to <span className="font-medium text-foreground">{recipients.join(", ")}</span></> : "an email goes to the admins"} (the same error at most every 6 hours; crashes in visitors&apos; browsers come in a daily summary).
        {!emailLive && " Email is in test mode right now, so alerts are only logged."}
      </p>

      {rows === null ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Apply the &ldquo;Error alerts&rdquo; database update above to switch the error log on.</p>
      ) : rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="size-4" /> No errors in the last 30 days.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => (
            <li key={r.id} className={cn("p-3 text-sm", r.resolved && "opacity-55")}>
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <span className="block text-xs text-muted-foreground">
                    {r.source === "server" ? "Server" : "Browser"} · {r.path ?? "unknown page"} · {r.count}× · {ago(r.lastSeenAt)}{r.resolved ? " · fixed" : ""}
                  </span>
                  <span className="block break-words font-mono text-xs">{r.message}</span>
                </button>
                {!r.resolved && <Button size="sm" variant="outline" className="h-7 shrink-0 px-2 text-xs" onClick={() => fix(r.id)} disabled={pending}>Mark fixed</Button>}
              </div>
              {open === r.id && r.detail && <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-secondary p-2 text-[11px]">{r.detail}</pre>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={test} disabled={pending || rows === null}><BellRing className="size-3.5" /> Send a test alert</Button>
        {openCount > 0 && <Button size="sm" variant="ghost" onClick={fixAll} disabled={pending}>Mark all {openCount} fixed</Button>}
      </div>
    </div>
  )
}
