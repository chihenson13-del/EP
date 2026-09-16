export type ColorPalette = {
  key: string
  label: string
  description: string
  primary: string
  accent: string
  background: string
}

/** Curated color palettes for the theme customization panel — all built from real, coordinated
 * hex values (extending the brand palette), never generated on the fly. */
export const COLOR_PALETTES: ColorPalette[] = [
  { key: "lavender-editorial", label: "Lavender Editorial", description: "Cream + Lavender + Plum", primary: "#403447", accent: "#D8CBE8", background: "#FFF9F2" },
  { key: "champagne-classic", label: "Champagne Classic", description: "Ivory + Taupe + Champagne", primary: "#5C4A32", accent: "#C8B9AA", background: "#FFFCF8" },
  { key: "soft-romance", label: "Soft Romance", description: "Blush + Cream + Mauve", primary: "#6B4652", accent: "#D9A0AC", background: "#FDF3F0" },
  { key: "modern-noir", label: "Modern Noir", description: "Ivory + Charcoal + Plum", primary: "#2B2730", accent: "#6F5A86", background: "#FFFCF8" },
  { key: "garden-evening", label: "Garden Evening", description: "Sage + Cream + Deep Green", primary: "#33422F", accent: "#8FA37E", background: "#FBFAF3" },
  { key: "pearl", label: "Pearl", description: "White + Beige + Taupe", primary: "#4A4340", accent: "#C8B9AA", background: "#FFFFFF" },
  { key: "midnight-gala", label: "Midnight Gala", description: "Deep Plum + Ivory + Gold", primary: "#403447", accent: "#B08D57", background: "#FFFCF8" },
  { key: "pastel-celebration", label: "Pastel Celebration", description: "Lavender + Peach + Cream", primary: "#4A3B5C", accent: "#F3C9A8", background: "#FFF9F2" },
]

export function getPalette(key: string | null | undefined): ColorPalette | null {
  return COLOR_PALETTES.find((p) => p.key === key) ?? null
}
