import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { getTheme } from "@/lib/themes"
import { ThemePicker } from "@/components/content/theme-picker"

export default async function ThemePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user } = await getEventContext(eventId)

  const [page, canUsePremiumThemes, canCustomize] = await Promise.all([
    db.eventPage.findUnique({ where: { eventId }, select: { layout: true, colors: true, fonts: true, theme: { select: { key: true } } } }),
    hasFeature(user.id, eventId, FEATURES.PREMIUM_THEMES),
    hasFeature(user.id, eventId, FEATURES.ADVANCED_THEME_CUSTOMIZATION),
  ])
  const layout = (page?.layout ?? null) as { themeKey?: string } | null
  const currentThemeKey = getTheme(layout?.themeKey || page?.theme?.key).key

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Theme</h1>
        <p className="text-muted-foreground text-sm mt-1">Pick a theme, then fine-tune fonts and colors. The preview is your real invitation and updates after every change.</p>
      </div>
      <ThemePicker
        eventId={eventId}
        currentThemeKey={currentThemeKey}
        currentColors={(page?.colors as Record<string, string> | null) ?? {}}
        currentFonts={(page?.fonts as { pairKey?: string; roles?: Record<string, string> } | null) ?? {}}
        canUsePremiumThemes={canUsePremiumThemes}
        canCustomize={canCustomize}
      />
    </div>
  )
}
