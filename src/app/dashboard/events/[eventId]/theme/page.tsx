import { getEventContext } from "@/lib/event-access"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { ThemePicker } from "@/components/content/theme-picker"

export default async function ThemePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { user } = await getEventContext(eventId)

  const [page, themes, canUsePremiumThemes, canCustomize] = await Promise.all([
    db.eventPage.findUnique({ where: { eventId } }),
    db.eventTheme.findMany({ orderBy: { name: "asc" } }),
    hasFeature(user.id, eventId, FEATURES.PREMIUM_THEMES),
    hasFeature(user.id, eventId, FEATURES.ADVANCED_THEME_CUSTOMIZATION),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Theme</h1>
        <p className="text-muted-foreground text-sm mt-1">Pick a starting theme, then fine-tune the fonts and colors.</p>
      </div>
      <ThemePicker
        eventId={eventId}
        themes={JSON.parse(JSON.stringify(themes))}
        currentThemeId={page?.themeId ?? null}
        currentColors={(page?.colors as Record<string, string>) ?? {}}
        currentFontPairKey={(page?.fonts as { pairKey?: string } | null)?.pairKey ?? null}
        canUsePremiumThemes={canUsePremiumThemes}
        canCustomize={canCustomize}
      />
    </div>
  )
}
