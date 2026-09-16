import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { resolveTheme, fontPairStyle } from "@/lib/theme-resolve"
import { getEventTypeConfig } from "@/lib/event-types"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { PublicEventView } from "@/components/public/public-event-view"
import { MusicPlayer } from "@/components/public/music-player"
import { BrandingFooter } from "@/components/public/branding-footer"

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const event = await db.event.findUnique({
    where: { slug },
    include: {
      page: { include: { theme: true } },
      sections: { where: { visible: true }, orderBy: { order: "asc" } },
      scheduleItems: { orderBy: { order: "asc" } },
      galleryImages: { where: { hidden: false }, orderBy: { order: "asc" } },
    },
  })

  if (!event || event.status === "ARCHIVED" || (event.status !== "PUBLISHED" && event.status !== "UNPUBLISHED")) {
    notFound()
  }
  if (event.status === "UNPUBLISHED") notFound()
  if (!event.isPublic) notFound()

  const theme = resolveTheme(event.page?.theme?.config, event.page?.colors, event.page?.fonts)
  const typeConfig = getEventTypeConfig(event.type)
  const showBranding = !(await hasFeature(event.ownerId, event.id, FEATURES.REMOVE_BRANDING))
  const fontStyle = fontPairStyle(theme.fontPair)

  return (
    <div
      style={{ backgroundColor: theme.background, color: theme.primary, ...fontStyle.style }}
      className={`min-h-screen font-sans ${fontStyle.className}`}
    >
      <PublicEventView event={JSON.parse(JSON.stringify(event))} theme={theme} typeLabel={typeConfig.label} />
      {showBranding && <BrandingFooter />}
      {event.musicEnabled && event.musicYoutubeVideoId && (
        <MusicPlayer
          config={{
            videoId: event.musicYoutubeVideoId,
            title: event.musicTitle,
            autoplay: event.musicAutoplay,
            startMuted: event.musicStartMuted,
            loop: event.musicLoop,
            volume: event.musicVolume,
            showControl: event.musicShowControl,
            showPlayer: event.musicShowPlayer,
          }}
        />
      )}
    </div>
  )
}
