export type ResolvedTheme = {
  primary: string
  accent: string
  background: string
  font: "sans" | "serif" | "rounded"
}

const DEFAULT_THEME: ResolvedTheme = { primary: "#403447", accent: "#6F5A86", background: "#FFF9F2", font: "serif" }

export function resolveTheme(themeConfig: unknown, overrideColors: unknown): ResolvedTheme {
  const base = (themeConfig ?? {}) as Partial<ResolvedTheme>
  const override = (overrideColors ?? {}) as Partial<ResolvedTheme>
  return {
    primary: override.primary ?? base.primary ?? DEFAULT_THEME.primary,
    accent: override.accent ?? base.accent ?? DEFAULT_THEME.accent,
    background: override.background ?? base.background ?? DEFAULT_THEME.background,
    font: override.font ?? base.font ?? DEFAULT_THEME.font,
  }
}

export function fontFamilyFor(font: ResolvedTheme["font"]): string {
  if (font === "serif") return "'Playfair Display', 'Iowan Old Style', Georgia, serif"
  if (font === "rounded") return "'Baloo 2', 'Comic Sans MS', sans-serif"
  return "'DM Sans', system-ui, sans-serif"
}
