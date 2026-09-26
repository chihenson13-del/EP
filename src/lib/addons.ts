/**
 * Optional paid add-ons, sold separately from the Free / Premium / Pro / Unlimited plans.
 *
 * SMS Invitations is the first one. It is PAUSED: the flag below is the single switch that every SMS code
 * path checks (the send action, the scheduled-send job, and the provider call itself), so nothing can reach
 * the SMS provider, create a delivery record, or charge anyone while it is false. It is a code constant on
 * purpose, not an environment variable or a setting, so no user or misconfigured deploy can turn it on.
 *
 * Launching SMS later means, in this order:
 *   1. give the add-on a price and a Plan/Purchase path of its own (it is NOT part of any current plan),
 *   2. grant FEATURES.SMS_MESSAGING from that purchase in lib/entitlements.ts (usage/credits alongside it),
 *   3. configure the provider (SMS_PROVIDER_* env vars, already read by lib/sms.ts),
 *   4. set SMS_FEATURE_ENABLED to true and switch the add-on's status to "AVAILABLE".
 */
export const SMS_FEATURE_ENABLED = false

export type AddOnStatus = "COMING_SOON" | "AVAILABLE"

export type AddOn = {
  key: "sms"
  name: string
  status: AddOnStatus
  tagline: string
  description: string
  costNote: string
}

export const SMS_ADDON: AddOn = {
  key: "sms",
  name: "SMS Invitations",
  status: SMS_FEATURE_ENABLED ? "AVAILABLE" : "COMING_SOON",
  tagline: "Reach your guests directly through SMS.",
  description: "Send invitations and event updates directly by SMS. This feature is currently being developed and will be available as an optional add-on.",
  costNote: "Additional cost applies.",
}

export const ADDONS: AddOn[] = [SMS_ADDON]

/** What every blocked SMS path returns, so the wording is the same wherever it surfaces. */
export const SMS_UNAVAILABLE_MESSAGE = "SMS invitations are currently unavailable. This feature is coming soon."

/** Shown in the small informational dialog behind every "Coming Soon" SMS button. */
export const SMS_COMING_SOON_DETAIL = "SMS invitations are coming soon. This feature will be available as an optional paid add-on. Additional cost applies."
