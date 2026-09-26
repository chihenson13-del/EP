import type { CSSProperties } from "react"
import { getFontPair } from "@/lib/font-pairs"
import { getFont, isFontKey } from "@/lib/fonts"
import { getTheme, RADIUS_PX, type ThemeColors, type ThemeDefinition } from "@/lib/themes"

/** Independently styleable text on the invitation. Anything else (FAQ, dress code, gifts, custom blocks) uses Body. */
export type FontRole = "title" | "heading" | "body" | "rsvp" | "button" | "schedule" | "venue"

export const FONT_ROLES: Array<{ key: FontRole; label: string; hint: string }> = [
  { key: "title", label: "Event title", hint: "The big name at the top" },
  { key: "heading", label: "Headings", hint: "Section titles" },
  { key: "body", label: "Body", hint: "Paragraphs, FAQ, dress code and other text blocks" },
  { key: "rsvp", label: "RSVP", hint: "The RSVP question and answers" },
  { key: "button", label: "Buttons", hint: "Button labels" },
  { key: "schedule", label: "Schedule", hint: "Times and items in the schedule" },
  { key: "venue", label: "Venue", hint: "Venue name and address" },
]

export type ResolvedTheme = ThemeDefinition & {
  colors: ThemeColors
  /** Final font key per role, after the theme defaults, a font pairing and per-role choices. */
  fontKeys: Record<FontRole, string>
  /** Shorthands used across components. */
  primary: string
  accent: string
  background: string
}

type ColorOverride = Partial<{ primary: string; accent: string; background: string }>
type FontOverride = Partial<{ pairKey: string; roles: Partial<Record<FontRole, string>> }>

const HEX = /^#[0-9a-fA-F]{6}$/

function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#1F1A24" : "#FFFFFF"
}

/**
 * Resolve what an invitation looks like.
 *  - themeKey: EventPage.layout.themeKey (a structured theme); falls back to the legacy EventTheme row's key.
 *  - colors / fonts: the owner's customisations on top of the theme (choosing a new theme clears them).
 */
export function resolveTheme(input: { themeKey?: string | null; legacyThemeKey?: string | null; colors?: unknown; fonts?: unknown }): ResolvedTheme {
  const def = getTheme(input.themeKey || input.legacyThemeKey)
  const colors: ThemeColors = { ...def.colors }

  const c = (input.colors ?? {}) as ColorOverride
  if (c.primary && HEX.test(c.primary)) { colors.text = c.primary; colors.primary = c.primary }
  if (c.accent && HEX.test(c.accent)) { colors.accent = c.accent; colors.accentText = readableOn(c.accent) }
  if (c.background && HEX.test(c.background)) {
    colors.background = c.background
    colors.backgroundImage = undefined
    colors.surface = `color-mix(in oklab, ${c.background}, white 45%)`
  }

  const fontKeys: Record<FontRole, string> = {
    title: def.fonts.title, heading: def.fonts.heading, body: def.fonts.body,
    rsvp: def.fonts.body, button: def.fonts.body, schedule: def.fonts.heading, venue: def.fonts.body,
  }
  const f = (input.fonts ?? {}) as FontOverride
  if (f.pairKey) {
    const pair = getFontPair(f.pairKey)
    fontKeys.heading = pair.heading
    fontKeys.schedule = pair.heading
    fontKeys.title = pair.accent ?? pair.heading
    fontKeys.body = fontKeys.rsvp = fontKeys.button = fontKeys.venue = pair.body
  }
  for (const [role, key] of Object.entries(f.roles ?? {})) {
    if (role in fontKeys && isFontKey(key)) fontKeys[role as FontRole] = key
  }

  return { ...def, colors, fontKeys, primary: colors.primary, accent: colors.accent, background: colors.background }
}

/**
 * CSS custom properties that carry a resolved theme into the invitation subtree. Components use
 * var(--ep-*) for colors and var(--font-*) for each text role, so one wrapper applies the whole theme.
 */
export function themeStyle(theme: ResolvedTheme): CSSProperties {
  const font = (role: FontRole) => getFont(theme.fontKeys[role]).cssFamily
  const style: CSSProperties & Record<string, string> = {
    "--ep-bg": theme.colors.background,
    "--ep-surface": theme.colors.surface,
    "--ep-text": theme.colors.text,
    "--ep-primary": theme.colors.primary,
    "--ep-secondary": theme.colors.secondary,
    "--ep-accent": theme.colors.accent,
    "--ep-accent-text": theme.colors.accentText,
    "--ep-border": theme.colors.border,
    "--ep-radius": `${RADIUS_PX[theme.radius]}px`,
    "--font-title": font("title"),
    "--font-heading": font("heading"),
    "--font-sans": font("body"),
    "--font-rsvp": font("rsvp"),
    "--font-button": font("button"),
    "--font-schedule": font("schedule"),
    "--font-venue": font("venue"),
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: font("body"),
  }
  if (theme.colors.backgroundImage) style.backgroundImage = theme.colors.backgroundImage
  if (theme.colors.backgroundImage) style.backgroundRepeat = "no-repeat"
  return style
}

/** Inline style for a themed button (shape + variant), used on the invitation and RSVP pages. */
export function buttonStyle(theme: ResolvedTheme): CSSProperties {
  const radius = theme.button.shape === "pill" ? 999 : theme.button.shape === "rounded" ? Math.max(8, RADIUS_PX[theme.radius]) : 0
  const base: CSSProperties = { borderRadius: radius, fontFamily: "var(--font-button)", borderWidth: 1.5, borderStyle: "solid" }
  if (theme.button.variant === "outline") return { ...base, background: "transparent", color: theme.colors.accent, borderColor: theme.colors.accent }
  if (theme.button.variant === "soft") return { ...base, background: `color-mix(in oklab, ${theme.colors.accent}, transparent 82%)`, color: theme.colors.primary, borderColor: "transparent" }
  return { ...base, background: theme.colors.accent, color: theme.colors.accentText, borderColor: theme.colors.accent }
}
