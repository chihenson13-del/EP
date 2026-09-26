/**
 * The font keys a design or theme may use, without loading any font files. Server code that only needs to
 * validate a key (the canvas sanitizer, server actions, unit tests) imports this instead of "@/lib/fonts",
 * which calls next/font and only works inside the Next.js build. A unit test keeps this list in sync with
 * FONT_REGISTRY.
 */
export const FONT_KEYS = [
  "playfair-display", "cormorant-garamond", "cormorant", "libre-baskerville", "lora", "dm-serif-display",
  "cinzel", "bodoni-moda", "merriweather", "crimson-text", "eb-garamond", "prata", "cardo", "spectral", "libre-caslon-display",
  "inter", "poppins", "montserrat", "dm-sans", "lato", "open-sans", "raleway", "nunito-sans", "manrope",
  "work-sans", "outfit", "plus-jakarta-sans", "great-vibes", "allura", "parisienne", "alex-brush", "dancing-script",
  "sacramento", "tangerine", "caveat", "pacifico", "satisfy", "abril-fatface", "josefin-sans", "league-spartan",
  "oswald", "bebas-neue", "comfortaa", "quicksand", "fredoka", "baloo-2",
] as const

const KEY_SET: ReadonlySet<string> = new Set(FONT_KEYS)

export function isFontKey(key: unknown): key is string {
  return typeof key === "string" && KEY_SET.has(key)
}
