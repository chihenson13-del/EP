import { cache } from "react"
import { db } from "@/lib/db"

/**
 * Exactly what the invitation renderer needs and nothing more — no owner data, no unrelated columns,
 * no hidden sections/photos. Shared by the public page and the owner's preview so both always show
 * the same saved configuration.
 */
const invitationSelect = {
  id: true,
  ownerId: true,
  slug: true,
  name: true,
  type: true,
  status: true,
  isPublic: true,
  hostName: true,
  date: true,
  endDate: true,
  timeLabel: true,
  venueName: true,
  address: true,
  mapUrl: true,
  description: true,
  personalizedRsvpOnly: true,
  rsvpDeadline: true,
  musicEnabled: true,
  musicYoutubeVideoId: true,
  musicTitle: true,
  musicAutoplay: true,
  musicStartMuted: true,
  musicLoop: true,
  musicVolume: true,
  musicShowControl: true,
  musicShowPlayer: true,
  page: { select: { colors: true, fonts: true, theme: { select: { config: true } } } },
  sections: { where: { visible: true }, orderBy: { order: "asc" as const }, select: { id: true, type: true, order: true, content: true } },
  scheduleItems: { orderBy: { order: "asc" as const }, select: { id: true, time: true, title: true, description: true, location: true } },
  design: { select: { width: true, height: true, canvasJson: true } },
} as const

/** Memoised per request so generateMetadata and the page share one query. */
export const loadInvitationBySlug = cache((slug: string) => db.event.findUnique({ where: { slug }, select: invitationSelect, relationLoadStrategy: "join" }))

export const loadInvitationById = cache((id: string) => db.event.findUnique({ where: { id }, select: invitationSelect, relationLoadStrategy: "join" }))

export type InvitationData = NonNullable<Awaited<ReturnType<typeof loadInvitationBySlug>>>

