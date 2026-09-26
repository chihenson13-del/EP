import { resolveTheme, themeStyle } from "@/lib/theme-resolve"
import { lookupMode, readRsvpButton, readRsvpForm, rsvpPath } from "@/lib/rsvp-settings"
import { getEventTypeConfig } from "@/lib/event-types"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import type { InvitationData } from "@/lib/invitation"
import { getGalleryForEvent } from "@/lib/gallery"
import { PublicEventView } from "@/components/public/public-event-view"
import { MusicPlayer } from "@/components/public/music-player"
import { BrandingFooter } from "@/components/public/branding-footer"
import { DesignCanvasView, hasVisibleDesign } from "@/components/public/design-canvas-view"
import { ZoomableDesign } from "@/components/public/zoomable-design"

/**
 * The invitation as guests see it. Used by the public page (/e/[slug]) and the owner's preview
 * (/preview/[eventId]) so a preview is always the real thing, never a mock.
 */
export async function InvitationPage({ event }: { event: InvitationData }) {
  const layout = (event.page?.layout ?? null) as { themeKey?: string } | null
  const theme = resolveTheme({ themeKey: layout?.themeKey, legacyThemeKey: event.page?.theme?.key, colors: event.page?.colors, fonts: event.page?.fonts })
  const typeConfig = getEventTypeConfig(event.type)
  const [showBrandingFeature, gallery] = await Promise.all([
    hasFeature(event.ownerId, event.id, FEATURES.REMOVE_BRANDING),
    getGalleryForEvent(event.id),
  ])
  const showBranding = !showBrandingFeature

  const canvas = event.design?.canvasJson as { objects?: unknown } | null | undefined
  const designObjects = canvas?.objects

  const viewEvent = {
    id: event.id,
    slug: event.slug,
    name: event.name,
    hostName: event.hostName,
    date: event.date?.toISOString() ?? null,
    endDate: event.endDate?.toISOString() ?? null,
    timeLabel: event.timeLabel,
    venueName: event.venueName,
    address: event.address,
    mapUrl: event.mapUrl,
    description: event.description,
    coverImageUrl: null,
    personalizedRsvpOnly: event.personalizedRsvpOnly,
    rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
    rsvp: {
      href: rsvpPath(event.slug),
      button: readRsvpButton(event.page?.layout),
      searchEnabled: lookupMode(readRsvpForm(event.page?.layout), event.personalizedRsvpOnly) !== "off",
    },
    hasMusicControl: !!(event.musicEnabled && event.musicYoutubeVideoId && event.musicShowControl),
    sections: event.sections.map((s) => ({ id: s.id, type: s.type, order: s.order, content: s.content as Record<string, unknown> })),
    scheduleItems: event.scheduleItems,
    galleryImages: gallery.map((g) => ({ id: g.id, url: g.url, caption: g.caption })),
  }

  return (
    // width:100% + max-width:100vw + overflow-x:clip is only the safety net: every section below is laid out to fit
    // a 320px screen on its own (fluid type, wrapping text, full-width buttons, responsive images).
    <div style={themeStyle(theme)} className="min-h-screen w-full max-w-[100vw] overflow-x-clip" data-theme-key={theme.key}>
      {event.design && hasVisibleDesign(designObjects) && (
        <section className="w-full px-4 pt-8 sm:pt-10 pb-2 max-w-2xl mx-auto">
          <ZoomableDesign width={event.design.width}>
            <DesignCanvasView width={event.design.width} height={event.design.height} objects={designObjects} />
          </ZoomableDesign>
        </section>
      )}
      <PublicEventView event={viewEvent} theme={theme} typeLabel={typeConfig.label} />
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
