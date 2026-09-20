"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Lock, Check } from "lucide-react"
import { setEventTheme, updateThemeColors, updateThemeFonts } from "@/actions/content"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UpgradeModal } from "@/components/payments/upgrade-modal"
import { FONT_PAIRS } from "@/lib/font-pairs"
import { getFont } from "@/lib/fonts"
import { COLOR_PALETTES } from "@/lib/color-palettes"

import { safe } from "@/lib/safe-action"
type Theme = { id: string; key: string; name: string; category: string; description: string | null; isPremium: boolean; config: { primary: string; accent: string; background: string } }

export function ThemePicker({
  eventId, themes, currentThemeId, currentColors, currentFontPairKey, canUsePremiumThemes, canCustomize,
}: {
  eventId: string
  themes: Theme[]
  currentThemeId: string | null
  currentColors: Record<string, string>
  currentFontPairKey: string | null
  canUsePremiumThemes: boolean
  canCustomize: boolean
}) {
  const [selected, setSelected] = useState(currentThemeId)
  const [colors, setColors] = useState({ primary: currentColors.primary ?? "", accent: currentColors.accent ?? "", background: currentColors.background ?? "" })
  const [activePalette, setActivePalette] = useState<string | null>(null)
  const [fontPairKey, setFontPairKey] = useState(currentFontPairKey ?? FONT_PAIRS[0].key)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  async function pick(theme: Theme) {
    if (theme.isPremium && !canUsePremiumThemes) {
      setUpgradeOpen(true)
      return
    }
    const result = await safe(setEventTheme(eventId, theme.id))
    if (!result.ok) {
        toast.error(result.error)
        return
      }
    setSelected(theme.id)
    toast.success(`Theme set to ${theme.name}.`)
  }

  async function saveColors() {
    if (!canCustomize) {
      setUpgradeOpen(true)
      return
    }
    const clean = Object.fromEntries(Object.entries(colors).filter(([, v]) => v))
    const result = await safe(updateThemeColors(eventId, clean))
    if (!result.ok) {
        toast.error(result.error)
        return
      }
    toast.success("Colors updated.")
  }

  async function applyPalette(palette: (typeof COLOR_PALETTES)[number]) {
    if (!canCustomize) {
      setUpgradeOpen(true)
      return
    }
    const result = await safe(updateThemeColors(eventId, { primary: palette.primary, accent: palette.accent, background: palette.background }))
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setColors({ primary: palette.primary, accent: palette.accent, background: palette.background })
    setActivePalette(palette.key)
    toast.success(`Palette set to ${palette.label}.`)
  }

  async function applyFontPair(pairKey: string) {
    if (!canCustomize) {
      setUpgradeOpen(true)
      return
    }
    const result = await safe(updateThemeFonts(eventId, pairKey))
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setFontPairKey(pairKey)
    toast.success("Font pairing updated.")
  }

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <Card key={theme.id} className={`cursor-pointer transition-shadow ${selected === theme.id ? "border-primary ring-1 ring-primary" : ""}`} onClick={() => pick(theme)}>
            <div className="h-20 rounded-t-xl flex" style={{ background: theme.config.background }}>
              <div className="w-1/2 flex items-center justify-center" style={{ color: theme.config.primary }}>
                <span className="font-heading font-bold text-sm">Aa</span>
              </div>
              <div className="w-1/2" style={{ background: theme.config.accent }} />
            </div>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{theme.name}</p>
                {selected === theme.id && <Check className="size-4 text-primary" />}
                {theme.isPremium && !canUsePremiumThemes && <Lock className="size-3.5 text-muted-foreground" />}
              </div>
              <Badge variant="outline" className="text-xs">{theme.category}</Badge>
              {theme.isPremium && <p className="text-xs text-amber-600">Premium</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="font-medium">Font pairing {!canCustomize && <span className="text-xs text-muted-foreground font-normal">(Premium+)</span>}</p>
            <p className="text-xs text-muted-foreground">Sets the heading and body typefaces across your invitation page.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {FONT_PAIRS.map((pair) => {
              const heading = getFont(pair.heading)
              const body = getFont(pair.body)
              const active = fontPairKey === pair.key
              return (
                <button
                  key={pair.key}
                  type="button"
                  onClick={() => applyFontPair(pair.key)}
                  className={`text-left rounded-lg border p-3 transition-colors hover:bg-secondary/50 ${active ? "border-primary ring-1 ring-primary bg-accent/20" : "border-border/70"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`${heading.className} text-lg`} style={{ fontFamily: heading.cssFamily }}>{pair.label}</span>
                    {active && <Check className="size-4 text-primary shrink-0" />}
                  </div>
                  <span className={`${body.className} text-xs text-muted-foreground`} style={{ fontFamily: body.cssFamily }}>{pair.description}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="font-medium">Color palettes {!canCustomize && <span className="text-xs text-muted-foreground font-normal">(Premium+)</span>}</p>
            <p className="text-xs text-muted-foreground">Curated combinations — pick one, or fine-tune below.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COLOR_PALETTES.map((palette) => {
              const active = activePalette === palette.key || (colors.primary === palette.primary && colors.accent === palette.accent && colors.background === palette.background)
              return (
                <button
                  key={palette.key}
                  type="button"
                  onClick={() => applyPalette(palette)}
                  className={`text-left rounded-lg border overflow-hidden transition-shadow hover:shadow-sm ${active ? "border-primary ring-1 ring-primary" : "border-border/70"}`}
                >
                  <div className="h-12 flex">
                    <div className="w-1/3" style={{ background: palette.primary }} />
                    <div className="w-1/3" style={{ background: palette.accent }} />
                    <div className="w-1/3" style={{ background: palette.background }} />
                  </div>
                  <div className="p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{palette.label}</p>
                      {active && <Check className="size-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{palette.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-medium">Custom colors {!canCustomize && <span className="text-xs text-muted-foreground font-normal">(Premium+)</span>}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Primary (text)</Label><Input type="color" value={colors.primary || "#2a2118"} onChange={(e) => setColors({ ...colors, primary: e.target.value })} className="h-9 p-1" /></div>
            <div className="space-y-1"><Label className="text-xs">Accent</Label><Input type="color" value={colors.accent || "#c8531f"} onChange={(e) => setColors({ ...colors, accent: e.target.value })} className="h-9 p-1" /></div>
            <div className="space-y-1"><Label className="text-xs">Background</Label><Input type="color" value={colors.background || "#fbf8f3"} onChange={(e) => setColors({ ...colors, background: e.target.value })} className="h-9 p-1" /></div>
          </div>
          <Button size="sm" onClick={saveColors}>Save colors</Button>
        </CardContent>
      </Card>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} eventId={eventId} featureLabel="Premium themes & custom colors" />
    </div>
  )
}
