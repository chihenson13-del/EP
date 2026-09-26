import { cache } from "react"
import { db } from "@/lib/db"
import type { PlanKey } from "@prisma/client"

/**
 * Central entitlement / feature-gating engine.
 *
 * Rule (per spec PART 62):
 *   Unlimited (account-wide, approved)?      -> everything unlocked
 *   else Pro (approved, for this event)?     -> Pro + Premium unlocked
 *   else Premium (approved, for this event)? -> Premium unlocked
 *   else                                     -> Free
 *
 * This NEVER trusts client state — every check re-derives the plan from
 * the database (Purchase + Entitlement tables), so it is safe to call from
 * server components, route handlers, and server actions alike.
 */

export type EffectivePlan = PlanKey

export const PLAN_RANK: Record<PlanKey, number> = {
  FREE: 0,
  PREMIUM: 1,
  PRO: 2,
  UNLIMITED: 3,
}

export const FEATURES = {
  PREMIUM_THEMES: "premium_themes",
  ADVANCED_THEME_CUSTOMIZATION: "advanced_theme_customization",
  CANVA_EDITOR: "canva_editor",
  CUSTOM_RSVP_QUESTIONS: "custom_rsvp_questions",
  ADVANCED_GUEST_TOOLS: "advanced_guest_tools",
  CSV_IMPORT: "csv_import",
  ADVANCED_SEATING: "advanced_seating",
  GALLERY: "gallery",
  MAPS_CALENDAR: "maps_calendar",
  QR_CODE: "qr_code",
  EXPORTS: "exports",
  REMOVE_BRANDING: "remove_branding",
  SMS_MESSAGING: "sms_messaging",
  EMAIL_SCHEDULING: "email_scheduling",
  ADVANCED_CHECKIN: "advanced_checkin",
  COORDINATOR_TOOLS: "coordinator_tools",
  CLIENT_COLLABORATION: "client_collaboration",
  CO_BRANDING: "co_branding",
  ADVANCED_ANALYTICS: "advanced_analytics",
  ADVANCED_EXPORTS: "advanced_exports",
  FULL_CUSTOMIZATION: "full_customization",
} as const

export type Feature = (typeof FEATURES)[keyof typeof FEATURES]

const PREMIUM_FEATURES: Feature[] = [
  FEATURES.PREMIUM_THEMES,
  FEATURES.ADVANCED_THEME_CUSTOMIZATION,
  FEATURES.CANVA_EDITOR,
  FEATURES.CUSTOM_RSVP_QUESTIONS,
  FEATURES.ADVANCED_GUEST_TOOLS,
  FEATURES.CSV_IMPORT,
  FEATURES.ADVANCED_SEATING,
  FEATURES.GALLERY,
  FEATURES.MAPS_CALENDAR,
  FEATURES.QR_CODE,
  FEATURES.EXPORTS,
  FEATURES.REMOVE_BRANDING,
]

const PRO_FEATURES: Feature[] = [
  ...PREMIUM_FEATURES,
  // SMS_MESSAGING is deliberately in no plan: SMS will be a separate paid add-on (see lib/addons.ts).
  FEATURES.EMAIL_SCHEDULING,
  FEATURES.ADVANCED_CHECKIN,
  FEATURES.COORDINATOR_TOOLS,
  FEATURES.CLIENT_COLLABORATION,
  FEATURES.CO_BRANDING,
  FEATURES.ADVANCED_ANALYTICS,
  FEATURES.ADVANCED_EXPORTS,
  FEATURES.FULL_CUSTOMIZATION,
]

const FEATURES_BY_PLAN: Record<PlanKey, Feature[]> = {
  FREE: [],
  PREMIUM: PREMIUM_FEATURES,
  PRO: PRO_FEATURES,
  UNLIMITED: PRO_FEATURES,
}

export type PlanLimits = {
  maxEvents: number | "unlimited"
  maxGuests: number | "unlimited"
  maxTables: number | "unlimited"
  maxCustomQuestions: number | "unlimited"
  maxGalleryImages: number | "unlimited"
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  FREE: { maxEvents: 3, maxGuests: 30, maxTables: 5, maxCustomQuestions: 1, maxGalleryImages: 6 },
  PREMIUM: { maxEvents: "unlimited", maxGuests: 300, maxTables: "unlimited", maxCustomQuestions: "unlimited", maxGalleryImages: "unlimited" },
  PRO: { maxEvents: "unlimited", maxGuests: "unlimited", maxTables: "unlimited", maxCustomQuestions: "unlimited", maxGalleryImages: "unlimited" },
  UNLIMITED: { maxEvents: "unlimited", maxGuests: "unlimited", maxTables: "unlimited", maxCustomQuestions: "unlimited", maxGalleryImages: "unlimited" },
}

export function planHasFeature(plan: PlanKey, feature: Feature): boolean {
  return FEATURES_BY_PLAN[plan].includes(feature)
}

export function getPlanLimits(plan: PlanKey): PlanLimits {
  return PLAN_LIMITS[plan]
}

/**
 * One query returns everything plan resolution needs: the user's active account-wide entitlements plus,
 * when an event is given, that event's active entitlements. Memoised per request so a page and the
 * components it renders never repeat the lookup.
 */
const getActiveEntitlements = cache(async (userId: string, eventId: string | null) => {
  return db.entitlement.findMany({
    relationLoadStrategy: "join",
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ scope: "ACCOUNT" }, ...(eventId ? [{ scope: "EVENT" as const, eventId }] : [])],
    },
    select: { scope: true, plan: { select: { key: true } } },
    orderBy: { activatedAt: "desc" },
  })
})

/** Does the user hold an ACTIVE account-wide Unlimited entitlement? */
export async function hasUnlimitedAccount(userId: string): Promise<boolean> {
  const rows = await getActiveEntitlements(userId, null)
  return rows.some((r) => r.scope === "ACCOUNT" && r.plan.key === "UNLIMITED")
}

/**
 * Resolve the effective plan for a given event, taking into account
 * account-wide Unlimited and per-event Premium/Pro entitlements.
 * Pass eventId = null to resolve only the account-wide plan (e.g. for
 * "can this user create another event" checks).
 */
export async function getEffectivePlan(userId: string, eventId: string | null): Promise<EffectivePlan> {
  const rows = await getActiveEntitlements(userId, eventId)
  if (rows.some((r) => r.scope === "ACCOUNT" && r.plan.key === "UNLIMITED")) return "UNLIMITED"
  if (!eventId) return "FREE"
  // Rows are ordered newest-first, so the first EVENT entitlement is the most recently activated one.
  return rows.find((r) => r.scope === "EVENT")?.plan.key ?? "FREE"
}

export async function hasFeature(userId: string, eventId: string | null, feature: Feature): Promise<boolean> {
  const plan = await getEffectivePlan(userId, eventId)
  return planHasFeature(plan, feature)
}

export async function requireFeature(userId: string, eventId: string | null, feature: Feature): Promise<void> {
  const allowed = await hasFeature(userId, eventId, feature)
  if (!allowed) {
    throw new Error(`FEATURE_LOCKED:${feature}`)
  }
}

export async function getEventLimits(userId: string, eventId: string | null): Promise<PlanLimits> {
  const plan = await getEffectivePlan(userId, eventId)
  return getPlanLimits(plan)
}

export const PLAN_PRICING: Record<PlanKey, { label: string; price: number; scope: "EVENT" | "ACCOUNT"; oneTime: boolean }> = {
  FREE: { label: "Free", price: 0, scope: "EVENT", oneTime: true },
  PREMIUM: { label: "Premium", price: 1500, scope: "EVENT", oneTime: true },
  PRO: { label: "Pro", price: 4000, scope: "EVENT", oneTime: true },
  UNLIMITED: { label: "Unlimited", price: 15000, scope: "ACCOUNT", oneTime: true },
}

export function formatPHP(amount: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount)
}
