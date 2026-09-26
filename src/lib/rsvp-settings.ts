/**
 * Owner-configurable RSVP settings, stored in EventPage.layout (no extra tables):
 *   layout.rsvpButton — the RSVP button on the invitation
 *   layout.rsvpForm   — what the RSVP page asks and how guests find their invitation
 * The RSVP *section* text/styling lives in that section's own content (EventSection.content).
 * Every reader falls back to sensible defaults, so events created before this existed get a working RSVP.
 */

export type RsvpButtonStyle = "theme" | "solid" | "outline" | "soft"
export type RsvpButtonSize = "sm" | "md" | "lg"
export type Align = "left" | "center" | "right"
export type RsvpPlacement = "section" | "hero" | "both" | "floating"
export type RsvpRadius = "theme" | "square" | "rounded" | "pill"

export type RsvpButtonConfig = {
  show: boolean
  text: string
  style: RsvpButtonStyle
  size: RsvpButtonSize
  align: Align
  placement: RsvpPlacement
  /** Button fill (solid/soft) or outline color; null = theme accent */
  color: string | null
  /** Text color; null = automatic for the chosen color */
  textColor: string | null
  radius: RsvpRadius
  borderWidth: number
}

export const DEFAULT_RSVP_BUTTON: RsvpButtonConfig = {
  show: true, text: "RSVP NOW", style: "theme", size: "lg", align: "center", placement: "section",
  color: null, textColor: null, radius: "theme", borderWidth: 1.5,
}

export type RsvpLookup = "name" | "name-verified" | "off"

export type RsvpFormConfig = {
  /** How guests without a personal link find their invitation. */
  lookup: RsvpLookup
  /** Optional message shown at the top of the RSVP page. */
  intro: string
  askCount: boolean
  askMeal: boolean
  /** Meal choices; empty = free text */
  mealOptions: string[]
  askDietary: boolean
  askMessage: boolean
  messageLabel: string
}

export const DEFAULT_RSVP_FORM: RsvpFormConfig = {
  lookup: "name", intro: "", askCount: true, askMeal: true, mealOptions: [], askDietary: true, askMessage: true, messageLabel: "Message for the host",
}

export type RsvpSectionContent = {
  heading: string
  text: string
  align: Align
  spacing: "compact" | "normal" | "spacious"
  background: "none" | "surface" | "accent" | "custom"
  backgroundColor: string | null
}

export const DEFAULT_RSVP_SECTION: RsvpSectionContent = {
  heading: "RSVP", text: "Please let us know if you'll be joining us.", align: "center", spacing: "normal", background: "none", backgroundColor: null,
}

const HEX = /^#[0-9a-fA-F]{6}$/
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => (options.includes(value as T) ? (value as T) : fallback)
const text = (value: unknown, max: number, fallback: string): string => (typeof value === "string" ? value.trim().slice(0, max) : fallback)
const bool = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback)
const hex = (value: unknown): string | null => (typeof value === "string" && HEX.test(value) ? value : null)

export function readRsvpButton(layout: unknown): RsvpButtonConfig {
  const v = ((layout as { rsvpButton?: unknown } | null)?.rsvpButton ?? {}) as Record<string, unknown>
  const d = DEFAULT_RSVP_BUTTON
  const label = text(v.text, 40, d.text)
  return {
    show: bool(v.show, d.show),
    text: label || d.text,
    style: oneOf(v.style, ["theme", "solid", "outline", "soft"] as const, d.style),
    size: oneOf(v.size, ["sm", "md", "lg"] as const, d.size),
    align: oneOf(v.align, ["left", "center", "right"] as const, d.align),
    placement: oneOf(v.placement, ["section", "hero", "both", "floating"] as const, d.placement),
    color: hex(v.color),
    textColor: hex(v.textColor),
    radius: oneOf(v.radius, ["theme", "square", "rounded", "pill"] as const, d.radius),
    borderWidth: typeof v.borderWidth === "number" && v.borderWidth >= 0 && v.borderWidth <= 4 ? v.borderWidth : d.borderWidth,
  }
}

export function readRsvpForm(layout: unknown): RsvpFormConfig {
  const v = ((layout as { rsvpForm?: unknown } | null)?.rsvpForm ?? {}) as Record<string, unknown>
  const d = DEFAULT_RSVP_FORM
  const meals = Array.isArray(v.mealOptions) ? v.mealOptions.filter((m): m is string => typeof m === "string").map((m) => m.trim().slice(0, 60)).filter(Boolean).slice(0, 12) : d.mealOptions
  return {
    lookup: oneOf(v.lookup, ["name", "name-verified", "off"] as const, d.lookup),
    intro: text(v.intro, 500, d.intro),
    askCount: bool(v.askCount, d.askCount),
    askMeal: bool(v.askMeal, d.askMeal),
    mealOptions: meals,
    askDietary: bool(v.askDietary, d.askDietary),
    askMessage: bool(v.askMessage, d.askMessage),
    messageLabel: text(v.messageLabel, 80, d.messageLabel) || d.messageLabel,
  }
}

export function readRsvpSection(content: unknown): RsvpSectionContent {
  const v = (content ?? {}) as Record<string, unknown>
  const d = DEFAULT_RSVP_SECTION
  return {
    heading: text(v.heading, 120, d.heading) || d.heading,
    text: typeof v.text === "string" ? v.text.trim().slice(0, 600) : d.text,
    align: oneOf(v.align, ["left", "center", "right"] as const, d.align),
    spacing: oneOf(v.spacing, ["compact", "normal", "spacious"] as const, d.spacing),
    background: oneOf(v.background, ["none", "surface", "accent", "custom"] as const, d.background),
    backgroundColor: hex(v.backgroundColor),
  }
}

/**
 * How guests without a personal link find their invitation. Personal links always work in every mode.
 *   "name"          — search by name; a confirmation (email / last 4 phone digits) is asked only for look-alike names
 *   "name-verified" — search by name, and every guest confirms their email or phone before seeing their RSVP
 *   "off"           — no name search: personal links only
 * The event's existing switch Event.personalizedRsvpOnly ("only the invited guest can respond", ON by default)
 * now means "name search must be verified", so events that had it ON get a working RSVP button whose search
 * still only lets the real guest in. "off" is only used when the host explicitly picks "Personal links only".
 */
export function lookupMode(form: RsvpFormConfig, personalizedRsvpOnly: boolean): RsvpLookup {
  if (!personalizedRsvpOnly) return "name"
  return form.lookup === "off" ? "off" : "name-verified"
}

/**
 * The RSVP deadline is a calendar day (stored as midnight UTC of that day). Guests can respond until the END of
 * that day in the app's timezone (Singapore, UTC+8) — "RSVP by September 20" includes all of September 20.
 */
export function rsvpDeadlineEnd(deadline: Date): Date {
  return new Date(`${deadline.toISOString().slice(0, 10)}T23:59:59.999+08:00`)
}

export function isRsvpClosed(event: { rsvpDeadline: Date | null; allowLateRsvp: boolean }, now = new Date()): boolean {
  return !!event.rsvpDeadline && !event.allowLateRsvp && now > rsvpDeadlineEnd(event.rsvpDeadline)
}

/** The public RSVP page for an event (search by name); personal links append the guest's token. */
export function rsvpPath(slug: string, token?: string): string {
  return token ? `/events/${encodeURIComponent(slug)}/rsvp/${encodeURIComponent(token)}` : `/events/${encodeURIComponent(slug)}/rsvp`
}
