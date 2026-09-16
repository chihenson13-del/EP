import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { ThemePicker } from "@/components/content/theme-picker"

export default async function ThemePage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireUser()
  const { eventId } = await params

  const event = await db.event.findUnique({ where: { id: eventId }, include: { page: true } })
  if (!event) notFound()

  const [themes, canUsePremiumThemes, canCustomize] = await Promise.all([
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
        currentThemeId={event.page?.themeId ?? null}
        currentColors={(event.page?.colors as Record<string, string>) ?? {}}
        currentFontPairKey={(event.page?.fonts as { pairKey?: string } | null)?.pairKey ?? null}
        canUsePremiumThemes={canUsePremiumThemes}
        canCustomize={canCustomize}
      />
    </div>
  )
}
