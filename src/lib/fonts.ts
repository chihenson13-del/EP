import {
  // Serif
  Playfair_Display, Cormorant_Garamond, Cormorant, Libre_Baskerville, DM_Serif_Display, Bodoni_Moda, Lora, Cinzel,
  EB_Garamond, Libre_Caslon_Display, Merriweather, Crimson_Text, Prata, Cardo, Spectral,
  // Sans serif
  Inter, DM_Sans, Manrope, Poppins, Montserrat, Plus_Jakarta_Sans, Lato, Open_Sans, Raleway, Nunito_Sans, Work_Sans, Outfit,
  // Script
  Great_Vibes, Allura, Parisienne, Alex_Brush, Sacramento, Dancing_Script, Tangerine, Caveat, Pacifico, Satisfy,
  // Display
  Abril_Fatface, Josefin_Sans, League_Spartan, Oswald, Bebas_Neue, Comfortaa, Quicksand, Fredoka, Baloo_2,
} from "next/font/google"

/**
 * The full selectable font catalog for invitation typography. Every font here is loaded through
 * next/font/google, which self-hosts the files at build time (no runtime request to Google), so any font
 * that appears in a picker is guaranteed to exist. `preload: false` keeps them lazy: a browser only
 * downloads a font's file when text on screen actually uses it.
 *
 * Non-variable families list the weights they ship with; variable families get their full weight range.
 */
// Serif
const playfairDisplay = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair-display" })
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--font-cormorant-garamond" })
const cormorant = Cormorant({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--font-cormorant" })
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], variable: "--font-libre-baskerville" })
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-dm-serif-display" })
const bodoniModa = Bodoni_Moda({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-bodoni-moda" })
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" })
const cinzel = Cinzel({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cinzel" })
const ebGaramond = EB_Garamond({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-eb-garamond" })
const libreCaslonDisplay = Libre_Caslon_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-libre-caslon-display" })
const merriweather = Merriweather({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], variable: "--font-merriweather" })
const crimsonText = Crimson_Text({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600", "700"], variable: "--font-crimson-text" })
const prata = Prata({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-prata" })
const cardo = Cardo({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], variable: "--font-cardo" })
const spectral = Spectral({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--font-spectral" })

// Sans serif
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" })
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans-selectable" })
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope" })
const poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--font-poppins" })
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-montserrat" })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-plus-jakarta-sans" })
const lato = Lato({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], variable: "--font-lato" })
const openSans = Open_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-open-sans" })
const raleway = Raleway({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-raleway" })
const nunitoSans = Nunito_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-nunito-sans" })
const workSans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-work-sans" })
const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-outfit" })

// Script
const greatVibes = Great_Vibes({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-great-vibes" })
const allura = Allura({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-allura" })
const parisienne = Parisienne({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-parisienne" })
const alexBrush = Alex_Brush({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-alex-brush" })
const sacramento = Sacramento({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-sacramento" })
const dancingScript = Dancing_Script({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dancing-script" })
const tangerine = Tangerine({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], variable: "--font-tangerine" })
const caveat = Caveat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-caveat" })
const pacifico = Pacifico({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-pacifico" })
const satisfy = Satisfy({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-satisfy" })

// Display
const abrilFatface = Abril_Fatface({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-abril-fatface" })
const josefinSans = Josefin_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-josefin-sans" })
const leagueSpartan = League_Spartan({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-league-spartan" })
const oswald = Oswald({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-oswald" })
const bebasNeue = Bebas_Neue({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-bebas-neue" })
const comfortaa = Comfortaa({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-comfortaa" })
const quicksand = Quicksand({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-quicksand" })
const fredoka = Fredoka({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fredoka" })
const baloo2 = Baloo_2({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-baloo-2" })

/** The four families a font belongs to. Kept in sync with FONT_CATEGORIES below. */
export type FontCategory = "SERIF" | "SANS SERIF" | "SCRIPT" | "DISPLAY"
/** Mood tags used by the picker's Modern / Classic filters. A font may carry both, one or neither. */
export type FontTag = "MODERN" | "CLASSIC"

export type FontDefinition = {
  key: string
  label: string
  category: FontCategory
  tags: FontTag[]
  variable: string
  className: string
  cssFamily: string
}

type Loaded = { variable: string; className: string; style: { fontFamily: string } }

function font(key: string, label: string, category: FontCategory, tags: FontTag[], loaded: Loaded): FontDefinition {
  return { key, label, category, tags, variable: loaded.variable, className: loaded.className, cssFamily: loaded.style.fontFamily }
}

export const FONT_REGISTRY: Record<string, FontDefinition> = {
  "playfair-display": font("playfair-display", "Playfair Display", "SERIF", ["CLASSIC"], playfairDisplay),
  "cormorant-garamond": font("cormorant-garamond", "Cormorant Garamond", "SERIF", ["CLASSIC"], cormorantGaramond),
  cormorant: font("cormorant", "Cormorant", "SERIF", ["CLASSIC"], cormorant),
  "libre-baskerville": font("libre-baskerville", "Libre Baskerville", "SERIF", ["CLASSIC"], libreBaskerville),
  lora: font("lora", "Lora", "SERIF", ["CLASSIC"], lora),
  "dm-serif-display": font("dm-serif-display", "DM Serif Display", "SERIF", ["MODERN"], dmSerifDisplay),
  cinzel: font("cinzel", "Cinzel", "SERIF", ["CLASSIC"], cinzel),
  "bodoni-moda": font("bodoni-moda", "Bodoni Moda", "SERIF", ["CLASSIC"], bodoniModa),
  merriweather: font("merriweather", "Merriweather", "SERIF", ["CLASSIC"], merriweather),
  "crimson-text": font("crimson-text", "Crimson Text", "SERIF", ["CLASSIC"], crimsonText),
  "eb-garamond": font("eb-garamond", "EB Garamond", "SERIF", ["CLASSIC"], ebGaramond),
  prata: font("prata", "Prata", "SERIF", ["CLASSIC"], prata),
  cardo: font("cardo", "Cardo", "SERIF", ["CLASSIC"], cardo),
  spectral: font("spectral", "Spectral", "SERIF", ["MODERN"], spectral),
  "libre-caslon-display": font("libre-caslon-display", "Libre Caslon Display", "SERIF", ["CLASSIC"], libreCaslonDisplay),

  inter: font("inter", "Inter", "SANS SERIF", ["MODERN"], inter),
  poppins: font("poppins", "Poppins", "SANS SERIF", ["MODERN"], poppins),
  montserrat: font("montserrat", "Montserrat", "SANS SERIF", ["MODERN"], montserrat),
  "dm-sans": font("dm-sans", "DM Sans", "SANS SERIF", ["MODERN"], dmSans),
  lato: font("lato", "Lato", "SANS SERIF", ["CLASSIC"], lato),
  "open-sans": font("open-sans", "Open Sans", "SANS SERIF", ["CLASSIC"], openSans),
  raleway: font("raleway", "Raleway", "SANS SERIF", ["MODERN"], raleway),
  "nunito-sans": font("nunito-sans", "Nunito Sans", "SANS SERIF", ["MODERN"], nunitoSans),
  manrope: font("manrope", "Manrope", "SANS SERIF", ["MODERN"], manrope),
  "work-sans": font("work-sans", "Work Sans", "SANS SERIF", ["MODERN"], workSans),
  outfit: font("outfit", "Outfit", "SANS SERIF", ["MODERN"], outfit),
  "plus-jakarta-sans": font("plus-jakarta-sans", "Plus Jakarta Sans", "SANS SERIF", ["MODERN"], plusJakartaSans),

  "great-vibes": font("great-vibes", "Great Vibes", "SCRIPT", ["CLASSIC"], greatVibes),
  allura: font("allura", "Allura", "SCRIPT", ["CLASSIC"], allura),
  parisienne: font("parisienne", "Parisienne", "SCRIPT", ["CLASSIC"], parisienne),
  "alex-brush": font("alex-brush", "Alex Brush", "SCRIPT", ["CLASSIC"], alexBrush),
  "dancing-script": font("dancing-script", "Dancing Script", "SCRIPT", [], dancingScript),
  sacramento: font("sacramento", "Sacramento", "SCRIPT", ["MODERN"], sacramento),
  tangerine: font("tangerine", "Tangerine", "SCRIPT", ["CLASSIC"], tangerine),
  caveat: font("caveat", "Caveat", "SCRIPT", ["MODERN"], caveat),
  pacifico: font("pacifico", "Pacifico", "SCRIPT", [], pacifico),
  satisfy: font("satisfy", "Satisfy", "SCRIPT", [], satisfy),

  "abril-fatface": font("abril-fatface", "Abril Fatface", "DISPLAY", ["CLASSIC"], abrilFatface),
  "josefin-sans": font("josefin-sans", "Josefin Sans", "DISPLAY", ["MODERN"], josefinSans),
  "league-spartan": font("league-spartan", "League Spartan", "DISPLAY", ["MODERN"], leagueSpartan),
  oswald: font("oswald", "Oswald", "DISPLAY", ["MODERN"], oswald),
  "bebas-neue": font("bebas-neue", "Bebas Neue", "DISPLAY", ["MODERN"], bebasNeue),
  comfortaa: font("comfortaa", "Comfortaa", "DISPLAY", ["MODERN"], comfortaa),
  quicksand: font("quicksand", "Quicksand", "DISPLAY", ["MODERN"], quicksand),
  fredoka: font("fredoka", "Fredoka", "DISPLAY", [], fredoka),
  "baloo-2": font("baloo-2", "Baloo 2", "DISPLAY", [], baloo2),
}

export const FONT_LIST = Object.values(FONT_REGISTRY)

/** Picker filters, in display order. Serif/Sans/Script/Display filter by family; Modern/Classic by mood tag. */
export const FONT_FILTERS: Array<{ key: string; label: string; match: (f: FontDefinition) => boolean }> = [
  { key: "all", label: "All", match: () => true },
  { key: "serif", label: "Serif", match: (f) => f.category === "SERIF" },
  { key: "sans", label: "Sans Serif", match: (f) => f.category === "SANS SERIF" },
  { key: "script", label: "Script", match: (f) => f.category === "SCRIPT" },
  { key: "display", label: "Display", match: (f) => f.category === "DISPLAY" },
  { key: "modern", label: "Modern", match: (f) => f.tags.includes("MODERN") },
  { key: "classic", label: "Classic", match: (f) => f.tags.includes("CLASSIC") },
]

export function isFontKey(key: unknown): key is string {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(FONT_REGISTRY, key)
}

export function getFont(key: string | null | undefined): FontDefinition {
  if (key && FONT_REGISTRY[key]) return FONT_REGISTRY[key]
  return FONT_REGISTRY["playfair-display"]
}
