import { PrismaClient, type Prisma } from "@prisma/client"
import { PLAN_PRICING } from "../src/lib/entitlements"

const db = new PrismaClient()

const PLAN_FEATURE_SUMMARY: Record<string, string[]> = {
  FREE: ["Basic event creation", "Basic invitation", "Basic RSVP", "Basic guest management", "Basic seating", "Up to 30 guests"],
  PREMIUM: ["Premium themes", "Canva-style editor", "AI invitation generator", "Custom RSVP questions", "Advanced seating", "Gallery, maps & QR", "Exports", "Remove branding"],
  PRO: ["Everything in Premium", "Unlimited guests", "Advanced floor plan", "Coordinator tools", "Client collaboration", "Co-branding", "Advanced analytics & exports"],
  UNLIMITED: ["Everything in Pro", "Applies account-wide", "Unlimited events", "New events auto-unlock"],
}

const THEMES: Array<{ key: string; name: string; category: string; description: string; isPremium: boolean; config: Record<string, unknown> }> = [
  { key: "minimal-ivory", name: "Minimal Ivory", category: "Minimal", description: "Clean type, generous whitespace, quiet confidence.", isPremium: false, config: { primary: "#2A2118", accent: "#C8531F", background: "#FBF8F3", font: "sans" } },
  { key: "modern-slate", name: "Modern Slate", category: "Modern", description: "Cool neutrals with a sharp geometric edge.", isPremium: false, config: { primary: "#1C2531", accent: "#3E63DD", background: "#F4F6F8", font: "sans" } },
  { key: "playful-pop", name: "Playful Pop", category: "Playful", description: "Bright color blocks for parties and kids events.", isPremium: false, config: { primary: "#2A1458", accent: "#FF5C8A", background: "#FFF6EE", font: "rounded" } },
  { key: "elegant-noir", name: "Elegant Noir", category: "Elegant", description: "Dark backdrop, gold accents, refined serif type.", isPremium: true, config: { primary: "#F5EFE3", accent: "#C9A227", background: "#151312", font: "serif" } },
  { key: "luxury-marble", name: "Luxury Marble", category: "Luxury", description: "Marbled texture cues with metallic accents.", isPremium: true, config: { primary: "#2B2A28", accent: "#8C7A57", background: "#F7F4EF", font: "serif" } },
  { key: "floral-bloom", name: "Floral Bloom", category: "Floral", description: "Original botanical illustration motifs.", isPremium: true, config: { primary: "#33422F", accent: "#D97757", background: "#FBF7EF", font: "serif" } },
  { key: "kids-carnival", name: "Kids Carnival", category: "Kids", description: "Balloons, confetti shapes, big friendly type.", isPremium: false, config: { primary: "#1E2A4A", accent: "#FFB020", background: "#EAF6FF", font: "rounded" } },
  { key: "corporate-edge", name: "Corporate Edge", category: "Corporate", description: "Sharp, professional, brand-forward.", isPremium: false, config: { primary: "#111827", accent: "#2563EB", background: "#FFFFFF", font: "sans" } },
  { key: "bold-statement", name: "Bold Statement", category: "Bold", description: "High contrast color and oversized type.", isPremium: true, config: { primary: "#FFFFFF", accent: "#FF3B30", background: "#0B0B0C", font: "sans" } },
  { key: "editorial-press", name: "Editorial Press", category: "Editorial", description: "Magazine-style layout with a strong grid.", isPremium: true, config: { primary: "#1A1A1A", accent: "#B3231C", background: "#F4F1EA", font: "serif" } },
  { key: "romantic-blush", name: "Romantic Blush", category: "Romantic", description: "Soft gradients and delicate linework.", isPremium: true, config: { primary: "#402A2E", accent: "#C97B84", background: "#FDF3F1", font: "serif" } },
  { key: "fun-confetti", name: "Fun Confetti", category: "Fun", description: "Scattered shapes and a playful palette.", isPremium: false, config: { primary: "#22223B", accent: "#F2A007", background: "#FFF9EE", font: "rounded" } },
  { key: "tropical-breeze", name: "Tropical Breeze", category: "Tropical", description: "Palm motifs and vivid warm-water color.", isPremium: true, config: { primary: "#0B3B36", accent: "#F4A93B", background: "#EFFAF6", font: "sans" } },
  { key: "classic-monogram", name: "Classic Monogram", category: "Classic", description: "Timeless serif with a centered monogram.", isPremium: true, config: { primary: "#26262A", accent: "#8A6D3B", background: "#FAF8F5", font: "serif" } },
]

async function main() {
  for (const [key, features] of Object.entries(PLAN_FEATURE_SUMMARY)) {
    const pricing = PLAN_PRICING[key as keyof typeof PLAN_PRICING]
    await db.plan.upsert({
      where: { key: key as "FREE" | "PREMIUM" | "PRO" | "UNLIMITED" },
      update: { name: pricing.label, price: pricing.price, scope: pricing.scope, features },
      create: { key: key as "FREE" | "PREMIUM" | "PRO" | "UNLIMITED", name: pricing.label, price: pricing.price, scope: pricing.scope, features },
    })
  }
  console.log(`Seeded ${Object.keys(PLAN_FEATURE_SUMMARY).length} plans.`)

  for (const theme of THEMES) {
    await db.eventTheme.upsert({
      where: { key: theme.key },
      update: { name: theme.name, category: theme.category, description: theme.description, isPremium: theme.isPremium, config: theme.config as Prisma.InputJsonValue },
      create: { ...theme, config: theme.config as Prisma.InputJsonValue },
    })
  }
  console.log(`Seeded ${THEMES.length} themes.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
