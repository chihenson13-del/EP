"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { sendEmail } from "@/lib/mailer"
import type { ActionResult } from "@/actions/events"
import type { CollaboratorRole } from "@prisma/client"

async function requireOwner(userId: string, eventId: string) {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { ownerId: true, name: true } })
  if (!event || event.ownerId !== userId) throw new Error("Only the event owner can manage collaborators.")
  return event
}

export async function inviteCollaborator(eventId: string, email: string, role: CollaboratorRole): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const event = await requireOwner(user.id, eventId).catch((e) => { throw e })

  const allowed = await hasFeature(user.id, eventId, FEATURES.CLIENT_COLLABORATION)
  if (!allowed) return { ok: false, error: "Client collaboration requires Pro or Unlimited." }

  const existing = await db.eventCollaborator.findFirst({ where: { eventId, invitedEmail: email.toLowerCase(), status: { not: "REVOKED" } } })
  if (existing) return { ok: false, error: "This email already has access or a pending invite." }

  const invitee = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  const collaborator = await db.eventCollaborator.create({
    data: { eventId, invitedEmail: email.toLowerCase(), userId: invitee?.id, role, status: invitee ? "ACTIVE" : "INVITED" },
  })

  await sendEmail({
    to: email,
    subject: `You've been invited to collaborate on ${event.name}`,
    html: `<p>You've been given <strong>${role}</strong> access to <strong>${event.name}</strong> on Events Partner.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/${invitee ? "dashboard" : "register"}">Open Events Partner</a></p>`,
  })

  revalidatePath(`/dashboard/events/${eventId}/settings/team`)
  return { ok: true, data: { id: collaborator.id } }
}

export async function updateCollaboratorRole(eventId: string, collaboratorId: string, role: CollaboratorRole): Promise<ActionResult> {
  const user = await requireUser()
  await requireOwner(user.id, eventId)
  await db.eventCollaborator.updateMany({ where: { id: collaboratorId, eventId }, data: { role } })
  revalidatePath(`/dashboard/events/${eventId}/settings/team`)
  return { ok: true, data: undefined }
}

export async function revokeCollaborator(eventId: string, collaboratorId: string): Promise<ActionResult> {
  const user = await requireUser()
  await requireOwner(user.id, eventId)
  await db.eventCollaborator.updateMany({ where: { id: collaboratorId, eventId }, data: { status: "REVOKED" } })
  revalidatePath(`/dashboard/events/${eventId}/settings/team`)
  return { ok: true, data: undefined }
}

/** Transfers ownership to a collaborator; the previous owner is kept on as a COORDINATOR so they retain management access. */
export async function transferOwnership(eventId: string, newOwnerUserId: string): Promise<ActionResult> {
  const user = await requireUser()
  const event = await requireOwner(user.id, eventId)

  const collaborator = await db.eventCollaborator.findFirst({ where: { eventId, userId: newOwnerUserId, status: "ACTIVE" } })
  if (!collaborator) return { ok: false, error: "That user must be an active collaborator before you can transfer ownership to them." }

  await db.$transaction([
    db.event.update({ where: { id: eventId }, data: { ownerId: newOwnerUserId } }),
    db.eventCollaborator.update({ where: { id: collaborator.id }, data: { role: "OWNER", status: "ACTIVE" } }),
    db.eventCollaborator.create({ data: { eventId, userId: user.id, invitedEmail: user.email!, role: "COORDINATOR", status: "ACTIVE" } }),
  ])

  await db.activityLog.create({ data: { actorId: user.id, action: "EVENT_OWNERSHIP_TRANSFERRED", targetType: "Event", targetId: eventId, metadata: { from: user.id, to: newOwnerUserId, eventName: event.name } } })

  revalidatePath(`/dashboard/events/${eventId}`)
  return { ok: true, data: undefined }
}
