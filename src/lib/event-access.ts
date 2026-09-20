import { cache } from "react"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"

export type EventAccessRole = "OWNER" | "COORDINATOR" | "CLIENT" | "VIEWER" | null

/**
 * Resolve the caller's role on an event: owner, active collaborator, or none.
 * A single query (event + this user's collaborator row), memoised per request.
 */
export const getEventAccessRole = cache(async (userId: string, eventId: string): Promise<EventAccessRole> => {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      ownerId: true,
      collaborators: { where: { userId, status: "ACTIVE" }, select: { role: true }, take: 1 },
    },
  })
  if (!event) return null
  if (event.ownerId === userId) return "OWNER"
  return event.collaborators[0]?.role ?? null
})

export async function canEditEvent(userId: string, eventId: string): Promise<boolean> {
  const role = await getEventAccessRole(userId, eventId)
  return role === "OWNER" || role === "COORDINATOR" || role === "CLIENT"
}

export async function canManagePayments(userId: string, eventId: string): Promise<boolean> {
  const role = await getEventAccessRole(userId, eventId)
  return role === "OWNER"
}

/**
 * Gate for every action that CHANGES an event. Throws unless the caller is the owner, a coordinator, or a
 * client collaborator — VIEWER collaborators are read-only.
 */
export async function requireEventAccess(userId: string, eventId: string): Promise<EventAccessRole> {
  const role = await getEventAccessRole(userId, eventId)
  if (!role) throw new Error("You do not have access to this event.")
  if (role === "VIEWER") throw new Error("You have view-only access to this event.")
  return role
}

/**
 * For server components: the signed-in user, the event (every column except the potentially large
 * cover image), and the caller's role. Calls notFound() when the event doesn't exist OR the caller has
 * no access, so a page never renders another account's data. Memoised per request, so the event layout
 * and the page share one round trip.
 */
export const getEventContext = cache(async (eventId: string) => {
  const user = await requireUser()
  const event = await db.event.findUnique({
    relationLoadStrategy: "join",
    where: { id: eventId },
    omit: { coverImageUrl: true },
    include: { collaborators: { where: { userId: user.id, status: "ACTIVE" }, select: { role: true }, take: 1 } },
  })
  if (!event) notFound()
  const role: Exclude<EventAccessRole, null> | null = event.ownerId === user.id ? "OWNER" : event.collaborators[0]?.role ?? null
  if (!role) notFound()
  return { user, event, role }
})
