/** Public contact address shown on the legal pages. Set NEXT_PUBLIC_SUPPORT_EMAIL in the environment. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "")

export const LEGAL_UPDATED = "21 September 2026"
