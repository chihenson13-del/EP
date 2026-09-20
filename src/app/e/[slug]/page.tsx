import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { loadInvitationBySlug } from "@/lib/invitation"
import { InvitationPage } from "@/components/public/invitation-page"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await loadInvitationBySlug(slug)
  if (!event || event.status !== "PUBLISHED" || !event.isPublic) return { title: "Event not found", robots: { index: false } }
  return { title: event.name, description: event.description?.slice(0, 160) || undefined }
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await loadInvitationBySlug(slug)

  // Only a published, public event is visible to guests. Drafts are previewed by their owner at /preview/[eventId].
  if (!event || event.status !== "PUBLISHED" || !event.isPublic) notFound()

  return <InvitationPage event={event} />
}
