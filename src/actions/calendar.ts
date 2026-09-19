"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { hasUnlimitedAccount } from "@/lib/entitlements"
import { getEventWindow, windowsOverlap } from "@/lib/booking-calendar"
import { parseIcsEvents, type ParsedIcsEvent } from "@/lib/ics-parser"
import type { ActionResult } from "@/actions/events"

async function requireUnlimited(userId: string) {
  const unlimited = await hasUnlimitedAccount(userId)
  if (!unlimited) throw new Error("BOOKING_CALENDAR_REQUIRES_UNLIMITED")
  return unlimited
}

export type ConflictInfo = { id: string; name: string; date: string; timeLabel: string | null; venueName: string | null } | null

/**
 * Checks the caller's OWN confirmed (published) events for a date/time overlap.
 * Server-enforced (requires an approved Unlimited entitlement) — never trusts
 * client state, and never looks at other accounts' events.
 */
export async function checkBookingConflict(input: {
  date: string
  timeLabel?: string
  excludeEventId?: string
}): Promise<ActionResult<ConflictInfo>> {
  const user = await requireUser()
  try {
    await requireUnlimited(user.id)
  } catch {
    return { ok: false, error: "Booking Calendar requires an approved Unlimited plan." }
  }

  const target = getEventWindow({ date: new Date(input.date), endDate: null, timeLabel: input.timeLabel ?? null })
  if (!target) return { ok: true, data: null }

  const dayStart = new Date(input.date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  const candidates = await db.event.findMany({
    where: {
      ownerId: user.id,
      status: "PUBLISHED",
      date: { gte: dayStart, lte: dayEnd },
      ...(input.excludeEventId ? { id: { not: input.excludeEventId } } : {}),
    },
    select: { id: true, name: true, date: true, endDate: true, timeLabel: true, venueName: true },
  })

  for (const c of candidates) {
    const window = getEventWindow(c)
    if (!window) continue
    if (windowsOverlap(target, window)) {
      return {
        ok: true,
        data: { id: c.id, name: c.name, date: c.date!.toISOString(), timeLabel: c.timeLabel, venueName: c.venueName },
      }
    }
  }
  return { ok: true, data: null }
}

// ── ICS import ──────────────────────────────────────────────────────────

export async function importIcsCalendar(icsText: string): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const user = await requireUser()
  try {
    await requireUnlimited(user.id)
  } catch {
    return { ok: false, error: "Booking Calendar requires an approved Unlimited plan." }
  }

  if (icsText.length > 2_000_000) return { ok: false, error: "That calendar file is too large." }

  let parsed: ParsedIcsEvent[]
  try {
    parsed = parseIcsEvents(icsText)
  } catch {
    return { ok: false, error: "Could not read that .ics file." }
  }
  if (parsed.length === 0) return { ok: false, error: "No events found in that calendar file." }

  let imported = 0
  let skipped = 0
  for (const ev of parsed.slice(0, 1000)) {
    const existing = await db.importedCalendarEvent.findUnique({
      where: { userId_uid: { userId: user.id, uid: ev.uid } },
    })
    if (existing) {
      skipped++
      continue
    }
    await db.importedCalendarEvent.create({
      data: {
        userId: user.id,
        uid: ev.uid,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        startAt: ev.startAt,
        endAt: ev.endAt,
        allDay: ev.allDay,
      },
    })
    imported++
  }

  revalidatePath("/dashboard/calendar")
  return { ok: true, data: { imported, skipped } }
}

export async function deleteImportedCalendarEvent(id: string): Promise<ActionResult> {
  const user = await requireUser()
  const event = await db.importedCalendarEvent.findUnique({ where: { id }, select: { userId: true } })
  if (!event || event.userId !== user.id) return { ok: false, error: "Not found." }
  await db.importedCalendarEvent.delete({ where: { id } })
  revalidatePath("/dashboard/calendar")
  return { ok: true, data: undefined }
}
