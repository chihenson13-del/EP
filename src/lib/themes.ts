/**
 * The invitation theme system. Each theme is a complete, structured definition: colors, fonts, button style,
 * corner radius, decoration, and how sections, the hero, RSVP and the gallery look. The invitation renderer
 * (components/public) reads ONLY these tokens, so selecting a theme changes the whole invitation — in the
 * editor preview, on the owner's preview, and on the published page alike.
 *
 * Adding a theme = adding one entry to THEMES. Keys are stored in EventPage.layout.themeKey.
 */

export type ButtonShape = "pill" | "rounded" | "square"
export type ButtonVariant = "solid" | "outline" | "soft"
export type Radius = "none" | "sm" | "md" | "lg" | "xl"
export type Decoration =
  | "none" | "floral" | "confetti" | "gold-lines" | "leaves" | "stars" | "waves" | "geometric" | "palm" | "twine" | "balloons" | "dots" | "deco"
export type SectionStyle = "plain" | "cards" | "bordered" | "alternating" | "framed"
export type TitleStyle = "classic" | "spaced" | "script" | "underline" | "bold"
export type HeroStyle = "gradient" | "solid" | "framed" | "arch" | "banner"
export type RsvpStyle = "card" | "outlined" | "filled"
export type GalleryStyle = "grid" | "rounded" | "polaroid" | "arch" | "circle"
export type Divider = "none" | "line" | "ornament" | "dots" | "wave"

export type ThemeColors = {
  /** Page background */
  background: string
  /** Optional CSS gradient layered over the background (hero & page) */
  backgroundImage?: string
  /** Card / section surface */
  surface: string
  /** Body text */
  text: string
  /** Headings */
  primary: string
  /** Secondary text / subtle UI */
  secondary: string
  /** Buttons, highlights, ornaments */
  accent: string
  /** Text drawn on top of the accent color */
  accentText: string
  /** Hairlines and borders */
  border: string
}

export type ThemeDefinition = {
  key: string
  name: string
  category: "Wedding" | "Elegant" | "Minimal" | "Celebration" | "Kids" | "Garden" | "Modern" | "Luxury" | "Destination" | "Rustic"
  description: string
  isPremium: boolean
  colors: ThemeColors
  fonts: { title: string; heading: string; body: string }
  button: { shape: ButtonShape; variant: ButtonVariant }
  radius: Radius
  decoration: Decoration
  sections: SectionStyle
  titleStyle: TitleStyle
  hero: HeroStyle
  rsvp: RsvpStyle
  gallery: GalleryStyle
  divider: Divider
}

export const THEMES: ThemeDefinition[] = [
  {
    key: "lavender-editorial", name: "Lavender Editorial", category: "Elegant", isPremium: false,
    description: "Cream paper, plum type and soft lavender — the Events Partner signature look.",
    colors: { background: "#FFF9F2", backgroundImage: "radial-gradient(120% 60% at 50% 0%, #EFE6F7 0%, rgba(255,249,242,0) 70%)", surface: "#FFFCF8", text: "#403447", primary: "#403447", secondary: "#756D78", accent: "#6F5A86", accentText: "#FFFCF8", border: "#E6DCEF" },
    fonts: { title: "playfair-display", heading: "playfair-display", body: "dm-sans" },
    button: { shape: "pill", variant: "solid" }, radius: "lg", decoration: "gold-lines", sections: "plain", titleStyle: "classic",
    hero: "gradient", rsvp: "card", gallery: "rounded", divider: "ornament",
  },
  {
    key: "romantic-blush", name: "Romantic Blush", category: "Wedding", isPremium: true,
    description: "Blush pinks, delicate script and soft florals for weddings and engagements.",
    colors: { background: "#FDF3F1", backgroundImage: "linear-gradient(180deg, #F9E1E0 0%, rgba(253,243,241,0) 55%)", surface: "#FFFAF8", text: "#5A3E45", primary: "#6B4652", secondary: "#9C7B83", accent: "#C97B84", accentText: "#FFFFFF", border: "#F0D5D6" },
    fonts: { title: "great-vibes", heading: "cormorant-garamond", body: "lato" },
    button: { shape: "pill", variant: "soft" }, radius: "xl", decoration: "floral", sections: "cards", titleStyle: "script",
    hero: "arch", rsvp: "card", gallery: "arch", divider: "ornament",
  },
  {
    key: "classic-ivory", name: "Classic Ivory", category: "Elegant", isPremium: false,
    description: "Timeless ivory and warm charcoal with a framed, formal layout.",
    colors: { background: "#FBF8F2", surface: "#FFFFFF", text: "#2F2A26", primary: "#2F2A26", secondary: "#7A7068", accent: "#8A6D3B", accentText: "#FFFFFF", border: "#E4DACB" },
    fonts: { title: "cinzel", heading: "cormorant-garamond", body: "eb-garamond" },
    button: { shape: "square", variant: "outline" }, radius: "none", decoration: "deco", sections: "framed", titleStyle: "spaced",
    hero: "framed", rsvp: "outlined", gallery: "grid", divider: "line",
  },
  {
    key: "midnight-elegance", name: "Midnight Elegance", category: "Luxury", isPremium: true,
    description: "Deep midnight backdrop, champagne-gold accents and refined serif type.",
    colors: { background: "#14131C", backgroundImage: "radial-gradient(90% 50% at 50% 0%, #2A2640 0%, rgba(20,19,28,0) 75%)", surface: "#1D1B28", text: "#E9E4D8", primary: "#F5EFE3", secondary: "#A8A095", accent: "#C9A95C", accentText: "#14131C", border: "#3A3548" },
    fonts: { title: "bodoni-moda", heading: "bodoni-moda", body: "manrope" },
    button: { shape: "rounded", variant: "solid" }, radius: "md", decoration: "stars", sections: "bordered", titleStyle: "spaced",
    hero: "solid", rsvp: "outlined", gallery: "grid", divider: "ornament",
  },
  {
    key: "garden-party", name: "Garden Party", category: "Garden", isPremium: false,
    description: "Sage greens and leafy details for outdoor and daytime celebrations.",
    colors: { background: "#F6F8F1", backgroundImage: "linear-gradient(180deg, #E4EDDA 0%, rgba(246,248,241,0) 60%)", surface: "#FFFFFF", text: "#33422F", primary: "#2F4A2B", secondary: "#6B7C62", accent: "#6E8F5B", accentText: "#FFFFFF", border: "#D6E2CB" },
    fonts: { title: "lora", heading: "lora", body: "nunito-sans" },
    button: { shape: "pill", variant: "solid" }, radius: "lg", decoration: "leaves", sections: "cards", titleStyle: "classic",
    hero: "gradient", rsvp: "card", gallery: "rounded", divider: "dots",
  },
  {
    key: "minimalist-cream", name: "Minimalist Cream", category: "Minimal", isPremium: false,
    description: "Quiet cream, generous space, one thin line. Nothing extra.",
    colors: { background: "#FAF6EF", surface: "#FAF6EF", text: "#3B362F", primary: "#2B2620", secondary: "#8C8479", accent: "#2B2620", accentText: "#FAF6EF", border: "#E5DED2" },
    fonts: { title: "dm-serif-display", heading: "dm-serif-display", body: "inter" },
    button: { shape: "square", variant: "outline" }, radius: "none", decoration: "none", sections: "plain", titleStyle: "underline",
    hero: "solid", rsvp: "outlined", gallery: "grid", divider: "line",
  },
  {
    key: "modern-bw", name: "Modern Black & White", category: "Modern", isPremium: false,
    description: "High-contrast black and white with bold geometric type.",
    colors: { background: "#FFFFFF", surface: "#F4F4F4", text: "#111111", primary: "#000000", secondary: "#5C5C5C", accent: "#111111", accentText: "#FFFFFF", border: "#DADADA" },
    fonts: { title: "bebas-neue", heading: "league-spartan", body: "work-sans" },
    button: { shape: "square", variant: "solid" }, radius: "none", decoration: "geometric", sections: "alternating", titleStyle: "bold",
    hero: "banner", rsvp: "filled", gallery: "grid", divider: "line",
  },
  {
    key: "pastel-celebration", name: "Pastel Celebration", category: "Celebration", isPremium: true,
    description: "Lavender, peach and mint with playful confetti for happy occasions.",
    colors: { background: "#FFF7F2", backgroundImage: "linear-gradient(135deg, #F6E8FF 0%, #FFEFE3 50%, #E8F8F1 100%)", surface: "#FFFFFF", text: "#4A3B5C", primary: "#4A3B5C", secondary: "#8A7C99", accent: "#B48CE0", accentText: "#FFFFFF", border: "#EFE2F7" },
    fonts: { title: "fredoka", heading: "quicksand", body: "nunito-sans" },
    button: { shape: "pill", variant: "solid" }, radius: "xl", decoration: "confetti", sections: "cards", titleStyle: "bold",
    hero: "gradient", rsvp: "card", gallery: "rounded", divider: "dots",
  },
  {
    key: "champagne-luxe", name: "Champagne Luxe", category: "Luxury", isPremium: true,
    description: "Champagne, ivory and gold foil lines for black-tie evenings.",
    colors: { background: "#FBF6EC", backgroundImage: "linear-gradient(180deg, #F3E7CF 0%, rgba(251,246,236,0) 50%)", surface: "#FFFDF8", text: "#4E4232", primary: "#5C4A32", secondary: "#9A8A73", accent: "#B8955A", accentText: "#FFFFFF", border: "#E8D9BC" },
    fonts: { title: "cormorant-garamond", heading: "cormorant-garamond", body: "montserrat" },
    button: { shape: "rounded", variant: "outline" }, radius: "sm", decoration: "gold-lines", sections: "framed", titleStyle: "spaced",
    hero: "framed", rsvp: "outlined", gallery: "polaroid", divider: "ornament",
  },
  {
    key: "soft-blue", name: "Soft Blue", category: "Minimal", isPremium: false,
    description: "Powder blue and white — calm, fresh and easy to read.",
    colors: { background: "#F3F7FB", backgroundImage: "linear-gradient(180deg, #DDEAF6 0%, rgba(243,247,251,0) 55%)", surface: "#FFFFFF", text: "#2C3E50", primary: "#223A55", secondary: "#6B7F93", accent: "#5B8DB8", accentText: "#FFFFFF", border: "#D5E3F0" },
    fonts: { title: "playfair-display", heading: "playfair-display", body: "open-sans" },
    button: { shape: "rounded", variant: "solid" }, radius: "md", decoration: "waves", sections: "cards", titleStyle: "classic",
    hero: "gradient", rsvp: "card", gallery: "rounded", divider: "wave",
  },
  {
    key: "birthday-playful", name: "Birthday Playful", category: "Celebration", isPremium: false,
    description: "Bright balloons, bold colors and big friendly type for birthdays.",
    colors: { background: "#FFFBF0", backgroundImage: "linear-gradient(180deg, #FFE7C2 0%, rgba(255,251,240,0) 55%)", surface: "#FFFFFF", text: "#2A1458", primary: "#2A1458", secondary: "#6B5B8C", accent: "#FF5C8A", accentText: "#FFFFFF", border: "#FFE0B2" },
    fonts: { title: "pacifico", heading: "poppins", body: "poppins" },
    button: { shape: "pill", variant: "solid" }, radius: "xl", decoration: "balloons", sections: "cards", titleStyle: "script",
    hero: "gradient", rsvp: "filled", gallery: "circle", divider: "dots",
  },
  {
    key: "kids-celebration", name: "Kids Celebration", category: "Kids", isPremium: false,
    description: "Sky blue, sunshine yellow and rounded shapes for kids' parties.",
    colors: { background: "#EAF6FF", backgroundImage: "linear-gradient(180deg, #CFEBFF 0%, rgba(234,246,255,0) 55%)", surface: "#FFFFFF", text: "#1E2A4A", primary: "#1E2A4A", secondary: "#5A6B8C", accent: "#FFB020", accentText: "#1E2A4A", border: "#CFE4F5" },
    fonts: { title: "baloo-2", heading: "baloo-2", body: "comfortaa" },
    button: { shape: "pill", variant: "solid" }, radius: "xl", decoration: "dots", sections: "cards", titleStyle: "bold",
    hero: "banner", rsvp: "filled", gallery: "circle", divider: "dots",
  },
  {
    key: "tropical", name: "Tropical", category: "Destination", isPremium: true,
    description: "Palm silhouettes, deep teal and warm sunset orange.",
    colors: { background: "#EFFAF6", backgroundImage: "linear-gradient(180deg, #CDEFE3 0%, rgba(239,250,246,0) 60%)", surface: "#FFFFFF", text: "#0B3B36", primary: "#0B3B36", secondary: "#4F7A74", accent: "#F4A93B", accentText: "#0B3B36", border: "#CBE9DF" },
    fonts: { title: "satisfy", heading: "josefin-sans", body: "raleway" },
    button: { shape: "pill", variant: "solid" }, radius: "lg", decoration: "palm", sections: "alternating", titleStyle: "script",
    hero: "gradient", rsvp: "card", gallery: "rounded", divider: "wave",
  },
  {
    key: "rustic", name: "Rustic", category: "Rustic", isPremium: true,
    description: "Kraft browns, twine details and handwritten script for barn and country events.",
    colors: { background: "#F5EEE3", backgroundImage: "linear-gradient(180deg, #EAD9C0 0%, rgba(245,238,227,0) 55%)", surface: "#FBF6EE", text: "#4A3A2A", primary: "#5A3E26", secondary: "#8C7560", accent: "#9C6B3F", accentText: "#FFFFFF", border: "#DECBB0" },
    fonts: { title: "alex-brush", heading: "merriweather", body: "work-sans" },
    button: { shape: "rounded", variant: "solid" }, radius: "sm", decoration: "twine", sections: "bordered", titleStyle: "script",
    hero: "framed", rsvp: "card", gallery: "polaroid", divider: "ornament",
  },
  {
    key: "floral", name: "Floral", category: "Garden", isPremium: true,
    description: "Botanical corner florals with dusty rose and olive.",
    colors: { background: "#FBF7EF", surface: "#FFFFFF", text: "#3E3A32", primary: "#4A4A2E", secondary: "#8A8266", accent: "#C4786A", accentText: "#FFFFFF", border: "#EBDFCF" },
    fonts: { title: "parisienne", heading: "prata", body: "lato" },
    button: { shape: "pill", variant: "outline" }, radius: "lg", decoration: "floral", sections: "framed", titleStyle: "script",
    hero: "arch", rsvp: "card", gallery: "arch", divider: "ornament",
  },
  {
    key: "modern-luxury", name: "Modern Luxury", category: "Luxury", isPremium: true,
    description: "Marble white, charcoal and brushed gold in a sharp editorial grid.",
    colors: { background: "#F7F4EF", backgroundImage: "linear-gradient(135deg, #FFFFFF 0%, #EEE8DF 100%)", surface: "#FFFFFF", text: "#2B2A28", primary: "#1F1E1C", secondary: "#7C766C", accent: "#A88A4F", accentText: "#FFFFFF", border: "#DDD4C6" },
    fonts: { title: "libre-caslon-display", heading: "spectral", body: "manrope" },
    button: { shape: "square", variant: "solid" }, radius: "sm", decoration: "deco", sections: "bordered", titleStyle: "spaced",
    hero: "banner", rsvp: "outlined", gallery: "grid", divider: "line",
  },
]

export const DEFAULT_THEME_KEY = "lavender-editorial"

/**
 * Themes saved before this system existed (rows in the EventTheme table) map to their closest structured theme,
 * so every existing event keeps a real, complete theme.
 */
export const LEGACY_THEME_MAP: Record<string, string> = {
  "minimal-ivory": "classic-ivory",
  "modern-slate": "soft-blue",
  "playful-pop": "birthday-playful",
  "elegant-noir": "midnight-elegance",
  "luxury-marble": "modern-luxury",
  "floral-bloom": "floral",
  "kids-carnival": "kids-celebration",
  "corporate-edge": "modern-bw",
  "bold-statement": "modern-bw",
  "editorial-press": "classic-ivory",
  "romantic-blush": "romantic-blush",
  "fun-confetti": "pastel-celebration",
  "tropical-breeze": "tropical",
  "classic-monogram": "champagne-luxe",
}

const BY_KEY = new Map(THEMES.map((t) => [t.key, t]))

export function isThemeKey(key: unknown): key is string {
  return typeof key === "string" && BY_KEY.has(key)
}

export function getTheme(key: string | null | undefined): ThemeDefinition {
  if (key && BY_KEY.has(key)) return BY_KEY.get(key)!
  if (key && LEGACY_THEME_MAP[key]) return BY_KEY.get(LEGACY_THEME_MAP[key])!
  return BY_KEY.get(DEFAULT_THEME_KEY)!
}

export const RADIUS_PX: Record<Radius, number> = { none: 0, sm: 6, md: 10, lg: 16, xl: 24 }
