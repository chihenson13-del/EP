"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { uniqueEventSlug } from "@/lib/slug"
import { createEventSchema, updateEventSchema, type CreateEventInput, type UpdateEventInput } from "@/lib/validations/event"
import { getEventTypeConfig } from "@/lib/event-types"
import { getEffectivePlan, hasUnlimitedAccount, getPlanLimits } from "@/lib/entitlements"
import type { EventStatus, SectionType, Prisma } from "@prisma/client"

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

export async function createEvent(input: CreateEventInput): Promise<ActionResult<{ eventId: string; slug: string }>> {
  const user = await requireUser()
  const parsed = createEventSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const accountPlan = await getEffectivePlan(user.id, null)
  const limits = getPlanLimits(accountPlan)
  if (limits.maxEvents !== "unlimited") {
    const count = await db.event.count({ where: { ownerId: user.id, archivedAt: null } })
    if (count >= limits.maxEvents) {
      return { ok: false, error: `Your plan allows up to ${limits.maxEvents} active events. Upgrade to Unlimited to create more.` }
    }
  }

  const { name, type, date, timeLabel, venueName } = parsed.data
  const slug = await uniqueEventSlug(name)
  const typeConfig = getEventTypeConfig(type)
  const unlimited = await hasUnlimitedAccount(user.id)

  const event = await db.event.create({
    data: {
      ownerId: user.id,
      name,
      type,
      slug,
      date: date ? new Date(date) : null,
      timeLabel: timeLabel || null,
      venueName: venueName || null,
      status: "DRAFT",
      page: { create: {} },
      design: { create: {} },
      floorPlan: { create: {} },
      sections: {
        create: typeConfig.suggestedSections.map((type, order) => ({
          type: type as SectionType,
          order,
          visible: true,
          content: toJson(defaultSectionContent(type as SectionType, name)),
        })),
      },
      customQuestions: {
        create: typeConfig.defaultRsvpQuestions.map((q, order) => ({
          label: q.label,
          type: q.type,
          required: false,
          options: q.options ?? undefined,
          order,
        })),
      },
      ...(unlimited
        ? {
            entitlements: {
              create: { userId: user.id, planId: await getPlanId("UNLIMITED"), scope: "ACCOUNT", grantedManually: false },
            },
          }
        : {}),
    },
  })

  revalidatePath("/dashboard")
  return { ok: true, data: { eventId: event.id, slug: event.slug } }
}

function defaultSectionContent(type: SectionType, eventName: string): Record<string, unknown> {
  switch (type) {
    case "HERO":
      return { heading: eventName, subheading: "You're invited!" }
    case "HOST":
      return { text: "" }
    case "DESCRIPTION":
      return { text: "" }
    case "FAQ":
      return { items: [] }
    case "DRESS_CODE":
      return { text: "" }
    case "GIFT_INFO":
      return { text: "" }
    case "FOOTER":
      return { text: `See you there! — ${eventName}` }
    default:
      return {}
  }
}

async function getPlanId(key: "FREE" | "PREMIUM" | "PRO" | "UNLIMITED") {
  const plan = await db.plan.findUniqueOrThrow({ where: { key } })
  return plan.id
}

export async function updateEvent(input: UpdateEventInput): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = updateEventSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  try {
    await requireEventAccess(user.id, parsed.data.eventId)
  } catch {
    return { ok: false, error: "You do not have access to this event." }
  }

  const d = parsed.data
  await db.event.update({
    where: { id: d.eventId },
    data: {
      name: d.name,
      type: d.type,
      customTypeLabel: d.customTypeLabel || null,
      hostName: d.hostName || null,
      date: d.date ? new Date(d.date) : null,
      endDate: d.endDate ? new Date(d.endDate) : null,
      timeLabel: d.timeLabel || null,
      timezone: d.timezone || undefined,
      venueName: d.venueName || null,
      address: d.address || null,
      mapUrl: d.mapUrl || null,
      description: d.description || null,
      rsvpDeadline: d.rsvpDeadline ? new Date(d.rsvpDeadline) : null,
      allowLateRsvp: d.allowLateRsvp,
      allowMaybe: d.allowMaybe,
      personalizedRsvpOnly: d.personalizedRsvpOnly,
      isPublic: d.isPublic,
      guestListVisible: d.guestListVisible,
      rsvpVisible: d.rsvpVisible,
    },
  })

  revalidatePath(`/dashboard/events/${d.eventId}`)
  return { ok: true, data: undefined }
}

export async function setEventStatus(eventId: string, status: EventStatus): Promise<ActionResult> {
  const user = await requireUser()
  try {
    await requireEventAccess(user.id, eventId)
  } catch {
    return { ok: false, error: "You do not have access to this event." }
  }

  await db.event.update({
    where: { id: eventId },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  })

  revalidatePath("/dashboard")
  revalidatePath(`/dashboard/events/${eventId}`)
  return { ok: true, data: undefined }
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const user = await requireUser()
  const role = await requireEventAccess(user.id, eventId).catch(() => null)
  if (role !== "OWNER") return { ok: false, error: "Only the owner can delete this event." }

  await db.event.delete({ where: { id: eventId } })
  revalidatePath("/dashboard")
  return { ok: true, data: undefined }
}

export async function duplicateEvent(eventId: string): Promise<ActionResult<{ eventId: string }>> {
  const user = await requireUser()
  try {
    await requireEventAccess(user.id, eventId)
  } catch {
    return { ok: false, error: "You do not have access to this event." }
  }

  const source = await db.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { sections: true, customQuestions: true, scheduleItems: true, tables: { include: { chairs: true } }, floorObjects: true, floorPlan: true, page: true },
  })

  const accountPlan = await getEffectivePlan(user.id, null)
  const limits = getPlanLimits(accountPlan)
  if (limits.maxEvents !== "unlimited") {
    const count = await db.event.count({ where: { ownerId: user.id, archivedAt: null } })
    if (count >= limits.maxEvents) {
      return { ok: false, error: `Your plan allows up to ${limits.maxEvents} active events. Upgrade to Unlimited to create more.` }
    }
  }

  const slug = await uniqueEventSlug(`${source.name} copy`)
  const unlimited = await hasUnlimitedAccount(user.id)

  const created = await db.event.create({
    data: {
      ownerId: user.id,
      name: `${source.name} (Copy)`,
      type: source.type,
      customTypeLabel: source.customTypeLabel,
      slug,
      status: "DRAFT",
      hostName: source.hostName,
      timeLabel: source.timeLabel,
      timezone: source.timezone,
      venueName: source.venueName,
      address: source.address,
      description: source.description,
      page: { create: { themeId: source.page?.themeId, colors: toJson(source.page?.colors) ?? undefined, fonts: toJson(source.page?.fonts) ?? undefined } },
      design: { create: {} },
      floorPlan: { create: { width: source.floorPlan?.width, height: source.floorPlan?.height, gridSize: source.floorPlan?.gridSize, backgroundColor: source.floorPlan?.backgroundColor } },
      sections: {
        create: source.sections.map((s) => ({ type: s.type, order: s.order, visible: s.visible, content: toJson(s.content ?? {}) })),
      },
      customQuestions: {
        create: source.customQuestions.map((q) => ({ label: q.label, type: q.type, required: q.required, options: q.options ? toJson(q.options) : undefined, order: q.order })),
      },
      scheduleItems: {
        create: source.scheduleItems.map((s) => ({ time: s.time, title: s.title, description: s.description, location: s.location, order: s.order })),
      },
      floorObjects: {
        create: source.floorObjects.map((o) => ({ type: o.type, label: o.label, x: o.x, y: o.y, width: o.width, height: o.height, rotation: o.rotation, color: o.color, locked: o.locked })),
      },
      ...(unlimited
        ? { entitlements: { create: { userId: user.id, planId: await getPlanId("UNLIMITED"), scope: "ACCOUNT", grantedManually: false } } }
        : {}),
    },
  })

  for (const table of source.tables) {
    await db.table.create({
      data: {
        eventId: created.id,
        name: table.name,
        number: table.number,
        shape: table.shape,
        width: table.width,
        height: table.height,
        x: table.x,
        y: table.y,
        rotation: table.rotation,
        capacity: table.capacity,
        color: table.color,
        borderColor: table.borderColor,
        borderWidth: table.borderWidth,
        labelVisible: table.labelVisible,
        seatSpacing: table.seatSpacing,
        chairs: {
          create: table.chairs.map((c) => ({ seatNumber: c.seatNumber, x: c.x, y: c.y, rotation: c.rotation, style: c.style })),
        },
      },
    })
  }

  revalidatePath("/dashboard")
  return { ok: true, data: { eventId: created.id } }
}

export async function createEventAndRedirect(input: CreateEventInput) {
  const result = await createEvent(input)
  if (result.ok) redirect(`/dashboard/events/${result.data.eventId}`)
  return result
}
