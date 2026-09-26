"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { applyDatabaseUpdates } from "@/actions/db-migrations"
import { safe } from "@/lib/safe-action"

type Row = { id: string; description: string; appliedAt: string | null }

export function DatabaseUpdatesCard({ migrations }: { migrations: Row[] }) {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState(migrations)
  const waiting = rows.filter((m) => !m.appliedAt)

  function apply() {
    startTransition(async () => {
      const result = await safe(applyDatabaseUpdates())
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const now = new Date().toISOString()
      setRows((prev) => prev.map((m) => (result.data.applied.includes(m.id) ? { ...m, appliedAt: now } : m)))
      toast.success(result.data.applied.length ? `Applied ${result.data.applied.length} database update(s).` : "Database is already up to date.")
    })
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-primary" aria-hidden />
        <p className="font-heading text-sm font-semibold uppercase tracking-[0.14em]">Database updates</p>
      </div>
      <p className="text-sm text-muted-foreground">
        New features sometimes need a new field or table. These updates only add things — they never delete or change existing data — and are safe to run more than once.
      </p>
      <ul className="space-y-2">
        {rows.map((m) => (
          <li key={m.id} className="flex items-start gap-2 text-sm">
            {m.appliedAt ? <CheckCircle2 className="size-4 mt-0.5 text-primary shrink-0" aria-label="Applied" /> : <span className="mt-1.5 size-2 rounded-full bg-amber-500 shrink-0" aria-label="Pending" />}
            <span>
              {m.description}
              <span className="block text-xs text-muted-foreground">{m.appliedAt ? `Applied ${m.appliedAt.slice(0, 16).replace("T", " ")} UTC` : "Pending"}</span>
            </span>
          </li>
        ))}
      </ul>
      <Button size="sm" onClick={apply} disabled={pending || waiting.length === 0}>
        {pending ? "Applying..." : waiting.length ? `Apply ${waiting.length} database update(s)` : "Up to date"}
      </Button>
    </div>
  )
}
