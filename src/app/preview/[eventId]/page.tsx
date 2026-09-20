import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { requireUser } from "@/lib/session"
import { getEventAccessRole } from "@/lib/event-access"
import { loadInvitationById } from "@/lib/invitation"
import { InvitationPage } from "@/components/public/invitation-page"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Invitation preview", robots: { index: false, follow: false } }

/**
 * The owner's private preview: the exact invitation renderer used for the public page, fed with the
 * event's SAVED data, regardless of publish status. Rendered on its own route (outside the dashboard
 * chrome) so it can be shown inside a device-sized frame with real responsive behaviour.
 */
export default async function PreviewRenderPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const user = await requireUser()

  const [event, role] = await Promise.all([loadInvitationById(eventId), getEventAccessRole(user.id, eventId)])
  if (!event || !role) notFound()

  return <InvitationPage event={event} />
}
