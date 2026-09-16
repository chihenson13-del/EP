import type { CSSProperties } from "react"
import { getFontPair, type FontPair } from "@/lib/font-pairs"
import { getFont } from "@/lib/fonts"

export type ResolvedTheme = {
  primary: string
  accent: string
  background: string
  /** @deprecated legacy 3-way font family, kept only so very old EventTheme.config rows still resolve to something. */
  font: "sans" | "serif" | "rounded"
  fontPair: FontPair
}

const DEFAULT_THEME: ResolvedTheme = {
  primary: "#403447", accent: "#6F5A86", background: "#FFF9F2", font: "serif",
  fontPair: getFontPair(null),
}

export function resolveTheme(themeConfig: unknown, overrideColors: unknown, overrideFonts?: unknown): ResolvedTheme {
  const base = (themeConfig ?? {}) as Partial<{ primary: string; accent: string; background: string; font: ResolvedTheme["font"] }>
  const override = (overrideColors ?? {}) as Partial<{ primary: string; accent: string; background: string; font: ResolvedTheme["font"] }>
  const fonts = (overrideFonts ?? {}) as Partial<{ pairKey: string }>

  return {
    primary: override.primary ?? base.primary ?? DEFAULT_THEME.primary,
    accent: override.accent ?? base.accent ?? DEFAULT_THEME.accent,
    background: override.background ?? base.background ?? DEFAULT_THEME.background,
    font: override.font ?? base.font ?? DEFAULT_THEME.font,
    fontPair: getFontPair(fonts.pairKey),
  }
}

/** @deprecated use the theme's `fontPair` (heading/body font keys resolved via FONT_REGISTRY) instead. */
export function fontFamilyFor(font: ResolvedTheme["font"]): string {
  if (font === "serif") return "'Playfair Display', 'Iowan Old Style', Georgia, serif"
  if (font === "rounded") return "'Baloo 2', 'Comic Sans MS', sans-serif"
  return "'DM Sans', system-ui, sans-serif"
}

/** CSS custom-property overrides + next/font variable classNames needed to apply a theme's font
 * pair to a subtree that uses the `font-heading` / `font-sans` Tailwind utilities. */
export function fontPairStyle(pair: FontPair): { className: string; style: CSSProperties } {
  const heading = getFont(pair.heading)
  const body = getFont(pair.body)
  const accent = pair.accent ? getFont(pair.accent) : null
  const className = [heading.variable, body.variable, accent?.variable].filter(Boolean).join(" ")
  const style: CSSProperties & Record<string, string> = {
    "--font-heading": heading.cssFamily,
    "--font-sans": body.cssFamily,
  }
  if (accent) style["--font-accent"] = accent.cssFamily
  return { className, style }
}
