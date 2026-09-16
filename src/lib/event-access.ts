import { db } from "@/lib/db"

export type EventAccessRole = "OWNER" | "COORDINATOR" | "CLIENT" | "VIEWER" | null

/** Resolve the caller's role on an event: owner, active collaborator, or none. */
export async function getEventAccessRole(userId: string, eventId: string): Promise<EventAccessRole> {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { ownerId: true } })
  if (!event) return null
  if (event.ownerId === userId) return "OWNER"

  const collab = await db.eventCollaborator.findFirst({
    where: { eventId, userId, status: "ACTIVE" },
    select: { role: true },
  })
  return collab?.role ?? null
}

export async function canEditEvent(userId: string, eventId: string): Promise<boolean> {
  const role = await getEventAccessRole(userId, eventId)
  return role === "OWNER" || role === "COORDINATOR" || role === "CLIENT"
}

export async function canManagePayments(userId: string, eventId: string): Promise<boolean> {
  const role = await getEventAccessRole(userId, eventId)
  return role === "OWNER"
}

/** Throws if the user has no access; returns the role otherwise. */
export async function requireEventAccess(userId: string, eventId: string): Promise<EventAccessRole> {
  const role = await getEventAccessRole(userId, eventId)
  if (!role) throw new Error("You do not have access to this event.")
  return role
}
