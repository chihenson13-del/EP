"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Lock, Check, Monitor, Smartphone, Tablet, RefreshCw, ExternalLink } from "lucide-react"
import { setEventTheme, updateThemeColors, updateThemeFonts } from "@/actions/content"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UpgradeModal } from "@/components/payments/upgrade-modal"
import { FontPicker } from "@/components/content/font-picker"
import { FONT_PAIRS } from "@/lib/font-pairs"
import { getFont } from "@/lib/fonts"
import { COLOR_PALETTES } from "@/lib/color-palettes"
import { THEMES, RADIUS_PX, type ThemeDefinition } from "@/lib/themes"
import { FONT_ROLES, resolveTheme, type FontRole } from "@/lib/theme-resolve"
import { cn } from "@/lib/utils"
import { safe } from "@/lib/safe-action"

type Fonts = { pairKey?: string; roles?: Partial<Record<FontRole, string>> }
type Colors = { primary?: string; accent?: string; background?: string }

const DEVICES = { mobile: { w: 390, icon: Smartphone, label: "Mobile" }, tablet: { w: 768, icon: Tablet, label: "Tablet" }, desktop: { w: 0, icon: Monitor, label: "Desktop" } } as const
type Device = keyof typeof DEVICES

const CATEGORIES = ["All", ...Array.from(new Set(THEMES.map((t) => t.category)))]

export function ThemePicker({
  eventId, currentThemeKey, currentColors, currentFonts, canUsePremiumThemes, canCustomize,
}: {
  eventId: string
  currentThemeKey: string
  currentColors: Colors
  currentFonts: Fonts
  canUsePremiumThemes: boolean
  canCustomize: boolean
}) {
  const [themeKey, setThemeKey] = useState(currentThemeKey)
  const [colors, setColors] = useState<Colors>(currentColors)
  const [fonts, setFonts] = useState<Fonts>(currentFonts)
  const [category, setCategory] = useState("All")
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [device, setDevice] = useState<Device>("mobile")
  const [nonce, setNonce] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()

  // The same resolver the invitation uses, so the controls always show what the page will render.
  const resolved = useMemo(() => resolveTheme({ themeKey, colors, fonts }), [themeKey, colors, fonts])
  const refreshPreview = () => { setLoaded(false); setNonce((n) => n + 1) }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, onOk: () => void, message: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onOk()
      refreshPreview()
      toast.success(message)
    })
  }

  function pick(theme: ThemeDefinition) {
    if (theme.isPremium && !canUsePremiumThemes) return setUpgradeOpen(true)
    if (theme.key === themeKey && !Object.keys(colors).length && !fonts.pairKey && !Object.keys(fonts.roles ?? {}).length) return
    run(() => safe(setEventTheme(eventId, theme.key)), () => { setThemeKey(theme.key); setColors({}); setFonts({}) }, `Theme set to ${theme.name}.`)
  }

  function saveColors(next: Colors, message = "Colors updated.") {
    if (!canCustomize) return setUpgradeOpen(true)
    run(() => safe(updateThemeColors(eventId, next as Record<string, string>)), () => setColors(next), message)
  }

  function setPair(pairKey: string) {
    if (!canCustomize) return setUpgradeOpen(true)
    run(() => safe(updateThemeFonts(eventId, { pairKey })), () => setFonts({ pairKey, roles: {} }), "Font pairing updated.")
  }

  function setRoleFont(role: FontRole, key: string | null) {
    if (!canCustomize) return setUpgradeOpen(true)
    run(() => safe(updateThemeFonts(eventId, { roles: { [role]: key } })), () => setFonts((f) => {
      const roles = { ...(f.roles ?? {}) }
      if (key === null) delete roles[role]
      else roles[role] = key
      return { ...f, roles }
    }), key ? "Font updated." : "Font reset to the theme's.")
  }

  const visibleThemes = THEMES.filter((t) => category === "All" || t.category === category)
  const width = DEVICES[device].w

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-8 min-w-0">
        {/* Themes */}
        <section className="space-y-3" aria-labelledby="themes-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="themes-heading" className="font-medium">Themes</h2>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Theme categories">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs", category === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary")}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
            {visibleThemes.map((theme) => {
              const active = theme.key === themeKey
              const locked = theme.isPremium && !canUsePremiumThemes
              return (
                <button key={theme.key} type="button" onClick={() => pick(theme)} disabled={pending}
                  aria-pressed={active} aria-label={`${theme.name} theme${locked ? " (Premium)" : ""}`}
                  className={cn("text-left rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring outline-none", active && "border-primary ring-2 ring-primary")}>
                  <ThemeSwatch theme={theme} />
                  <div className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{theme.name}</p>
                      {active ? <Check className="size-4 text-primary" /> : locked ? <Lock className="size-3.5 text-muted-foreground" /> : null}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{theme.description}</p>
                    <div className="flex gap-1 pt-1">
                      <Badge variant="outline" className="text-[10px]">{theme.category}</Badge>
                      {theme.isPremium && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Premium</Badge>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Fonts */}
        <Card>
          <CardContent className="p-4 space-y-5">
            <div>
              <p className="font-medium">Fonts {!canCustomize && <span className="text-xs text-muted-foreground font-normal">(Premium+)</span>}</p>
              <p className="text-xs text-muted-foreground">Start from a pairing, then fine-tune each kind of text. Choosing a new theme resets these to the theme&apos;s fonts.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {FONT_PAIRS.map((pair) => {
                const heading = getFont(pair.heading)
                const body = getFont(pair.body)
                const active = fonts.pairKey === pair.key && !Object.keys(fonts.roles ?? {}).length
                return (
                  <button key={pair.key} type="button" onClick={() => setPair(pair.key)} disabled={pending} aria-pressed={active}
                    className={cn("text-left rounded-lg border p-3 hover:bg-secondary/50", active ? "border-primary ring-1 ring-primary" : "border-border/70")}>
                    <div className="flex items-center justify-between">
                      <span className="text-lg" style={{ fontFamily: heading.cssFamily }}>{pair.label}</span>
                      {active && <Check className="size-4 text-primary shrink-0" />}
                    </div>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: body.cssFamily }}>{pair.description}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {FONT_ROLES.map((role) => (
                <div key={role.key} className="space-y-1.5">
                  <Label className="text-xs">{role.label} <span className="text-muted-foreground font-normal">— {role.hint}</span></Label>
                  <FontPicker
                    label={role.label}
                    value={resolved.fontKeys[role.key]}
                    onChange={(key) => setRoleFont(role.key, key)}
                    onReset={fonts.roles?.[role.key] ? () => setRoleFont(role.key, null) : undefined}
                    disabled={pending}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="font-medium">Colors {!canCustomize && <span className="text-xs text-muted-foreground font-normal">(Premium+)</span>}</p>
              <p className="text-xs text-muted-foreground">Recolor the current theme. Its layout, fonts and decorations stay.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {COLOR_PALETTES.map((palette) => {
                const active = colors.primary === palette.primary && colors.accent === palette.accent && colors.background === palette.background
                return (
                  <button key={palette.key} type="button" disabled={pending} aria-pressed={active}
                    onClick={() => saveColors({ primary: palette.primary, accent: palette.accent, background: palette.background }, `Palette set to ${palette.label}.`)}
                    className={cn("text-left rounded-lg border overflow-hidden hover:shadow-sm", active ? "border-primary ring-1 ring-primary" : "border-border/70")}>
                    <div className="h-10 flex">
                      <div className="w-1/3" style={{ background: palette.primary }} />
                      <div className="w-1/3" style={{ background: palette.accent }} />
                      <div className="w-1/3" style={{ background: palette.background }} />
                    </div>
                    <p className="p-2 text-xs font-medium">{palette.label}</p>
                  </button>
                )
              })}
            </div>
            <CustomColors key={`${themeKey}-${JSON.stringify(colors)}`} resolved={{ primary: resolved.colors.text, accent: resolved.colors.accent, background: resolved.colors.background }} disabled={pending}
              onSave={(next) => saveColors(next)} onReset={Object.keys(colors).length ? () => saveColors({}, "Colors reset to the theme's.") : undefined} />
          </CardContent>
        </Card>
      </div>

      {/* Live preview — the real invitation page, reloaded after every change */}
      <aside className="xl:sticky xl:top-4 xl:self-start space-y-2" aria-label="Live preview">
        <div className="flex items-center gap-1 rounded-xl border bg-card p-1.5">
          {(Object.keys(DEVICES) as Device[]).map((d) => {
            const Icon = DEVICES[d].icon
            return <Button key={d} size="sm" variant={device === d ? "secondary" : "ghost"} onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={`${DEVICES[d].label} preview`}><Icon className="size-4" /></Button>
          })}
          <Button size="sm" variant="ghost" onClick={refreshPreview} aria-label="Refresh preview"><RefreshCw className={cn("size-4", pending && "animate-spin")} /></Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" asChild><a href={`/preview/${eventId}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Open</a></Button>
        </div>
        <div className="rounded-2xl border bg-secondary/40 p-3 flex justify-center overflow-hidden">
          <div className={cn("relative bg-white overflow-hidden", width ? "rounded-[1.75rem] border-[6px] border-foreground/80" : "rounded-lg w-full")} style={width ? { width: Math.min(width, 390), maxWidth: "100%" } : undefined}>
            {!loaded && <div className="absolute inset-0 z-10 grid place-items-center bg-background/70 text-xs text-muted-foreground" role="status">Updating preview…</div>}
            <iframe key={`${device}-${nonce}`} title="Theme preview" src={`/preview/${eventId}?t=${nonce}`} onLoad={() => setLoaded(true)} className="block w-full border-0" style={{ height: "min(72vh, 760px)", width: width > 390 ? width : "100%", transform: width > 390 ? `scale(${390 / width})` : undefined, transformOrigin: "top left" }} />
          </div>
        </div>
      </aside>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} eventId={eventId} featureLabel="Premium themes & custom fonts/colors" />
    </div>
  )
}

/** A small, real rendering of the theme's tokens (colors, title font, button shape, radius). */
function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  const c = theme.colors
  const radius = theme.button.shape === "pill" ? 999 : theme.button.shape === "rounded" ? 8 : 0
  const title = getFont(theme.fonts.title)
  const body = getFont(theme.fonts.body)
  return (
    <div className="h-28 relative flex flex-col items-center justify-center gap-1.5 px-3" style={{ background: c.background, backgroundImage: c.backgroundImage }}>
      <span className="text-2xl leading-none truncate max-w-full" style={{ fontFamily: title.cssFamily, color: c.primary }}>Celebrate</span>
      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: body.cssFamily, color: c.secondary }}>Save the date</span>
      <span className="px-3 py-0.5 text-[10px] font-medium" style={{
        borderRadius: radius, fontFamily: body.cssFamily,
        ...(theme.button.variant === "outline" ? { border: `1px solid ${c.accent}`, color: c.accent } : theme.button.variant === "soft" ? { background: `color-mix(in oklab, ${c.accent}, transparent 80%)`, color: c.primary } : { background: c.accent, color: c.accentText }),
      }}>RSVP</span>
      <span className="absolute inset-2 pointer-events-none" style={{ border: theme.sections === "framed" || theme.hero === "framed" ? `1px solid ${c.accent}` : undefined, borderRadius: RADIUS_PX[theme.radius] / 2 }} />
    </div>
  )
}

function CustomColors({ resolved, disabled, onSave, onReset }: { resolved: Required<Colors>; disabled: boolean; onSave: (c: Colors) => void; onReset?: () => void }) {
  const [draft, setDraft] = useState(resolved)
  const hex = (v: string, f: string) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : f)
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Custom colors</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Text</Label><Input type="color" value={hex(draft.primary, "#403447")} onChange={(e) => setDraft({ ...draft, primary: e.target.value })} className="h-9 p-1" /></div>
        <div className="space-y-1"><Label className="text-xs">Accent</Label><Input type="color" value={hex(draft.accent, "#6f5a86")} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} className="h-9 p-1" /></div>
        <div className="space-y-1"><Label className="text-xs">Background</Label><Input type="color" value={hex(draft.background, "#fff9f2")} onChange={(e) => setDraft({ ...draft, background: e.target.value })} className="h-9 p-1" /></div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(draft)} disabled={disabled}>Save colors</Button>
        {onReset && <Button size="sm" variant="ghost" onClick={onReset} disabled={disabled}>Use theme colors</Button>}
      </div>
    </div>
  )
}
