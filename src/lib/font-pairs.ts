export type FontPair = {
  key: string
  label: string
  heading: string
  body: string
  accent?: string
  description: string
}

/** Curated heading/body (and occasionally accent) font pairings, built entirely from FONT_REGISTRY keys. */
export const FONT_PAIRS: FontPair[] = [
  { key: "classic-editorial", label: "Classic Editorial", heading: "playfair-display", body: "inter", description: "Playfair Display + Inter" },
  { key: "romantic", label: "Romantic", heading: "cormorant-garamond", body: "dm-sans", description: "Cormorant Garamond + DM Sans" },
  { key: "luxury", label: "Luxury", heading: "bodoni-moda", body: "manrope", description: "Bodoni Moda + Manrope" },
  { key: "timeless", label: "Timeless", heading: "libre-baskerville", body: "inter", description: "Libre Baskerville + Inter" },
  { key: "soft", label: "Soft", heading: "lora", body: "dm-sans", description: "Lora + DM Sans" },
  { key: "modern", label: "Modern", heading: "dm-serif-display", body: "manrope", description: "DM Serif Display + Manrope" },
  { key: "script-elegance", label: "Script Elegance", heading: "cormorant-garamond", body: "inter", accent: "great-vibes", description: "Cormorant Garamond + Great Vibes + Inter" },
]

export function getFontPair(key: string | null | undefined): FontPair {
  return FONT_PAIRS.find((p) => p.key === key) ?? FONT_PAIRS[0]
}
