"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/session"
import { applyPendingMigrations } from "@/lib/db-migrations"
import type { ActionResult } from "@/actions/events"

/** Admin-only: apply the fixed, additive database updates listed in lib/db-migrations.ts. */
export async function applyDatabaseUpdates(): Promise<ActionResult<{ applied: string[] }>> {
  await requireAdmin()
  const result = await applyPendingMigrations()
  revalidatePath("/admin/settings")
  if (result.error) return { ok: false, error: `Stopped at ${result.error}` }
  return { ok: true, data: { applied: result.applied } }
}
