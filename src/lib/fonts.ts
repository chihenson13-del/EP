import {
  Playfair_Display, Cormorant_Garamond, Cormorant, Libre_Baskerville, DM_Serif_Display,
  Bodoni_Moda, Lora, Cinzel, EB_Garamond, Libre_Caslon_Display,
  Inter, DM_Sans, Manrope, Poppins, Montserrat, Plus_Jakarta_Sans,
  Great_Vibes, Allura, Parisienne, Alex_Brush, Sacramento,
} from "next/font/google"

/**
 * The full selectable font catalog for invitation typography. Each font is loaded once here
 * via next/font/google (self-hosted, no runtime Google Fonts request) and exposed as a CSS
 * variable. Next.js only emits the actual font files for variables that end up rendered in a
 * page's output, so selecting one font pairing on a public event page doesn't pull in the rest.
 */

const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-display", display: "swap" })
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant-garamond", display: "swap" })
const cormorant = Cormorant({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant", display: "swap" })
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-libre-baskerville", display: "swap" })
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif-display", display: "swap" })
const bodoniModa = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni-moda", display: "swap" })
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" })
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" })
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: "--font-eb-garamond", display: "swap" })
const libreCaslonDisplay = Libre_Caslon_Display({ subsets: ["latin"], weight: "400", variable: "--font-libre-caslon-display", display: "swap" })

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans-selectable", display: "swap" })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" })
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" })
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta-sans", display: "swap" })

const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-great-vibes", display: "swap" })
const allura = Allura({ subsets: ["latin"], weight: "400", variable: "--font-allura", display: "swap" })
const parisienne = Parisienne({ subsets: ["latin"], weight: "400", variable: "--font-parisienne", display: "swap" })
const alexBrush = Alex_Brush({ subsets: ["latin"], weight: "400", variable: "--font-alex-brush", display: "swap" })
const sacramento = Sacramento({ subsets: ["latin"], weight: "400", variable: "--font-sacramento", display: "swap" })

export type FontCategory = "SERIF" | "SANS SERIF" | "EDITORIAL" | "SCRIPT" | "DISPLAY"

export type FontDefinition = {
  key: string
  label: string
  category: FontCategory
  variable: string
  className: string
  cssFamily: string
}

function font(key: string, label: string, category: FontCategory, loaded: { variable: string; className: string; style: { fontFamily: string } }): FontDefinition {
  return { key, label, category, variable: loaded.variable, className: loaded.className, cssFamily: loaded.style.fontFamily }
}

export const FONT_REGISTRY: Record<string, FontDefinition> = {
  "playfair-display": font("playfair-display", "Playfair Display", "EDITORIAL", playfairDisplay),
  "cormorant-garamond": font("cormorant-garamond", "Cormorant Garamond", "EDITORIAL", cormorantGaramond),
  cormorant: font("cormorant", "Cormorant", "SERIF", cormorant),
  "libre-baskerville": font("libre-baskerville", "Libre Baskerville", "SERIF", libreBaskerville),
  "dm-serif-display": font("dm-serif-display", "DM Serif Display", "EDITORIAL", dmSerifDisplay),
  "bodoni-moda": font("bodoni-moda", "Bodoni Moda", "EDITORIAL", bodoniModa),
  lora: font("lora", "Lora", "SERIF", lora),
  cinzel: font("cinzel", "Cinzel", "DISPLAY", cinzel),
  "eb-garamond": font("eb-garamond", "EB Garamond", "SERIF", ebGaramond),
  "libre-caslon-display": font("libre-caslon-display", "Libre Caslon Display", "DISPLAY", libreCaslonDisplay),

  inter: font("inter", "Inter", "SANS SERIF", inter),
  "dm-sans": font("dm-sans", "DM Sans", "SANS SERIF", dmSans),
  manrope: font("manrope", "Manrope", "SANS SERIF", manrope),
  poppins: font("poppins", "Poppins", "SANS SERIF", poppins),
  montserrat: font("montserrat", "Montserrat", "SANS SERIF", montserrat),
  "plus-jakarta-sans": font("plus-jakarta-sans", "Plus Jakarta Sans", "SANS SERIF", plusJakartaSans),

  "great-vibes": font("great-vibes", "Great Vibes", "SCRIPT", greatVibes),
  allura: font("allura", "Allura", "SCRIPT", allura),
  parisienne: font("parisienne", "Parisienne", "SCRIPT", parisienne),
  "alex-brush": font("alex-brush", "Alex Brush", "SCRIPT", alexBrush),
  sacramento: font("sacramento", "Sacramento", "SCRIPT", sacramento),
}

export const FONT_LIST = Object.values(FONT_REGISTRY)

export function getFont(key: string | null | undefined): FontDefinition {
  if (key && FONT_REGISTRY[key]) return FONT_REGISTRY[key]
  return FONT_REGISTRY["playfair-display"]
}
