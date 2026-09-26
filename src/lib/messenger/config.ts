/**
 * Meta Messenger configuration, read on the server only. META_APP_SECRET, the webhook verify token and the
 * token-encryption key never reach the browser: nothing here is NEXT_PUBLIC_ and this module is imported only by
 * server code (route handlers, server actions, server components).
 *
 * The integration is LIVE only when META_MESSENGER_ENABLED is exactly "true" AND every required value is set.
 * Until Meta has approved the app (docs/meta-app-review.md), leave META_MESSENGER_ENABLED=false.
 */

export type MetaConfig = {
  appId: string
  appSecret: string
  redirectUri: string
  graphVersion: string
  webhookVerifyToken: string
  encryptionKey: Buffer
  /** Optional Facebook Login for Business configuration ID. When set it is sent as config_id instead of scope. */
  loginConfigId: string | null
}

export type MetaConfigStatus =
  | { live: true; enabled: true; config: MetaConfig; missing: [] }
  | { live: false; enabled: boolean; config: null; missing: string[] }

/** Permissions requested from the Page admin (Messenger Platform overview: Facebook Login for Business). */
export const META_SCOPES = ["pages_show_list", "pages_messaging", "pages_manage_metadata", "business_management"]

/** Webhook fields the connected Page is subscribed to. Message text is never stored; see webhook handler. */
export const META_WEBHOOK_FIELDS = ["messages", "messaging_postbacks", "messaging_referrals", "message_deliveries", "message_reads"]

export function getMetaConfig(): MetaConfigStatus {
  const enabled = process.env.META_MESSENGER_ENABLED === "true"
  const env = {
    META_APP_ID: process.env.META_APP_ID?.trim() ?? "",
    META_APP_SECRET: process.env.META_APP_SECRET?.trim() ?? "",
    META_REDIRECT_URI: process.env.META_REDIRECT_URI?.trim() ?? "",
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION?.trim() ?? "",
    META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ?? "",
    META_TOKEN_ENCRYPTION_KEY: process.env.META_TOKEN_ENCRYPTION_KEY?.trim() ?? "",
  }
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k)

  let key: Buffer | null = null
  if (env.META_TOKEN_ENCRYPTION_KEY) {
    key = Buffer.from(env.META_TOKEN_ENCRYPTION_KEY, "base64")
    if (key.length !== 32) missing.push("META_TOKEN_ENCRYPTION_KEY (must be 32 bytes, base64)")
  }
  if (env.META_GRAPH_API_VERSION && !/^v\d+\.\d+$/.test(env.META_GRAPH_API_VERSION)) missing.push("META_GRAPH_API_VERSION (format v25.0)")
  if (env.META_REDIRECT_URI && !/^https:\/\//.test(env.META_REDIRECT_URI)) missing.push("META_REDIRECT_URI (must be https)")

  if (!enabled || missing.length || !key) return { live: false, enabled, config: null, missing }
  return {
    live: true,
    enabled: true,
    missing: [],
    config: {
      appId: env.META_APP_ID,
      appSecret: env.META_APP_SECRET,
      redirectUri: env.META_REDIRECT_URI,
      graphVersion: env.META_GRAPH_API_VERSION,
      webhookVerifyToken: env.META_WEBHOOK_VERIFY_TOKEN,
      encryptionKey: key,
      loginConfigId: process.env.META_LOGIN_CONFIG_ID?.trim() || null,
    },
  }
}

/** Messenger text messages are limited to 2,000 characters (Send API reference). */
export const MESSENGER_TEXT_LIMIT = 2000

/** Meta's standard messaging window: replies are allowed up to 24 hours after the person's last message/interaction. */
export const STANDARD_WINDOW_MS = 24 * 60 * 60 * 1000
