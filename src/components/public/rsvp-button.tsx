import { ArrowRight } from "lucide-react"
import { buttonStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import type { RsvpButtonConfig } from "@/lib/rsvp-settings"

/** Black or white text, whichever reads better on the given hex background. */
export function readableTextOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1f1a24" : "#ffffff"
}

const SIZE_CLASS: Record<RsvpButtonConfig["size"], string> = {
  sm: "min-h-11 px-5 text-sm",
  md: "min-h-12 px-6 text-base",
  lg: "min-h-14 px-8 text-[clamp(1rem,4.2vw,1.125rem)]",
}

/** The final inline style for the owner's button settings on top of the theme. */
export function rsvpButtonStyle(config: RsvpButtonConfig, theme: ResolvedTheme, onAccent = false): React.CSSProperties {
  const themed = buttonStyle(theme)
  const color = config.color ?? (onAccent ? theme.colors.accentText : theme.colors.accent)
  const radius =
    config.radius === "square" ? 0 : config.radius === "rounded" ? 12 : config.radius === "pill" ? 999 : themed.borderRadius
  const base: React.CSSProperties = { borderRadius: radius, borderStyle: "solid", borderWidth: config.borderWidth, fontFamily: "var(--font-button)" }

  switch (config.style) {
    case "solid":
      return { ...base, background: color, borderColor: color, color: config.textColor ?? readableTextOn(color) }
    case "outline":
      return { ...base, background: "transparent", borderColor: color, color: config.textColor ?? color }
    case "soft":
      return { ...base, background: `color-mix(in oklab, ${color}, transparent 84%)`, borderColor: "transparent", color: config.textColor ?? (onAccent ? theme.colors.accentText : theme.colors.primary) }
    default: {
      // The theme's own button look. On an accent-filled RSVP block the theme button would vanish, so invert it.
      if (onAccent && !config.color) {
        return { ...themed, ...base, background: theme.colors.accentText, borderColor: theme.colors.accentText, color: config.textColor ?? theme.colors.accent }
      }
      const custom: React.CSSProperties = config.color ? { background: themed.background === "transparent" ? "transparent" : color, borderColor: color, color: themed.background === "transparent" ? color : readableTextOn(color) } : {}
      return { ...themed, ...base, ...custom, ...(config.textColor ? { color: config.textColor } : {}) }
    }
  }
}

/**
 * The invitation's RSVP call to action: a real link to /events/{slug}/rsvp. Full width (up to a comfortable
 * maximum) on phones so it can never be cut off, natural width from tablets up, and at least 44px tall to tap.
 */
export function RsvpButton({ href, config, theme, onAccent = false, className = "" }: { href: string; config: RsvpButtonConfig; theme: ResolvedTheme; onAccent?: boolean; className?: string }) {
  const justify = config.align === "left" ? "justify-start" : config.align === "right" ? "justify-end" : "justify-center"
  return (
    <div className={`flex w-full ${justify} ${className}`}>
      <a
        href={href}
        className={`group inline-flex w-full max-w-sm sm:w-auto sm:min-w-[14rem] items-center justify-center gap-2 py-3 text-center font-semibold uppercase tracking-[0.12em] leading-tight break-words transition-[filter,transform] hover:brightness-95 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${SIZE_CLASS[config.size]}`}
        style={{ ...rsvpButtonStyle(config, theme, onAccent), outlineColor: theme.colors.accent }}
      >
        <span className="min-w-0">{config.text}</span>
        <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </a>
    </div>
  )
}
