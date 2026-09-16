"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Lock, Check } from "lucide-react"
import { setEventTheme, updateThemeColors } from "@/actions/content"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UpgradeModal } from "@/components/payments/upgrade-modal"

type Theme = { id: string; key: string; name: string; category: string; description: string | null; isPremium: boolean; config: { primary: string; accent: string; background: string } }

export function ThemePicker({
  eventId, themes, currentThemeId, currentColors, canUsePremiumThemes, canCustomize,
}: { eventId: string; themes: Theme[]; currentThemeId: string | null; currentColors: Record<string, string>; canUsePremiumThemes: boolean; canCustomize: boolean }) {
  const [selected, setSelected] = useState(currentThemeId)
  const [colors, setColors] = useState({ primary: currentColors.primary ?? "", accent: currentColors.accent ?? "", background: currentColors.background ?? "" })
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  async function pick(theme: Theme) {
    if (theme.isPremium && !canUsePremiumThemes) {
      setUpgradeOpen(true)
      return
    }
    const result = await setEventTheme(eventId, theme.id)
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
    const result = await updateThemeColors(eventId, clean)
    if (!result.ok) {
        toast.error(result.error)
        return
      }
    toast.success("Colors updated.")
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
