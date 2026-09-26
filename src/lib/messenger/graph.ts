import type { MetaConfig } from "@/lib/messenger/config"
import { hmacHex } from "@/lib/messenger/crypto"

/**
 * Minimal server-side Graph API client. The access token travels in the Authorization header (never in a URL
 * that could be logged), every call carries appsecret_proof, and responses are parsed into a friendly error
 * category so raw Meta error payloads and tokens are never shown to users.
 */

export type GraphErrorKind =
  | "TOKEN_EXPIRED" | "PERMISSION_DENIED" | "RATE_LIMITED" | "RECIPIENT_UNAVAILABLE" | "WINDOW_CLOSED"
  | "INVALID_REQUEST" | "APP_NOT_APPROVED" | "NETWORK" | "UNKNOWN"

export type GraphResult<T> = { ok: true; data: T } | { ok: false; kind: GraphErrorKind; code: string }

export const GRAPH_ERROR_MESSAGES: Record<GraphErrorKind, string> = {
  TOKEN_EXPIRED: "Your Meta connection has expired. Please reconnect your Page.",
  PERMISSION_DENIED: "Meta didn't allow this. Check that the Page is still connected and the app has the required permissions.",
  RATE_LIMITED: "Meta is limiting how fast messages can be sent. Please wait a moment and try again.",
  RECIPIENT_UNAVAILABLE: "This guest can't be reached on Messenger right now.",
  WINDOW_CLOSED: "The guest hasn't messaged your Page in the last 24 hours, so Meta doesn't allow a message yet.",
  INVALID_REQUEST: "Meta rejected the message. Please check it and try again.",
  APP_NOT_APPROVED: "Messenger messaging isn't approved for this app yet.",
  NETWORK: "Couldn't reach Meta. Please try again.",
  UNKNOWN: "Meta couldn't process this request. Please try again later.",
}

function classify(code: number, subcode: number | undefined): GraphErrorKind {
  if (code === 190 || code === 102) return "TOKEN_EXPIRED"
  if (code === 4 || code === 17 || code === 32 || code === 613) return "RATE_LIMITED"
  if (code === 551 || subcode === 1545041) return "RECIPIENT_UNAVAILABLE"
  if (code === 10 && subcode === 2018278) return "WINDOW_CLOSED"
  if (code === 10 || code === 200 || code === 3 || (code >= 200 && code < 300)) return "PERMISSION_DENIED"
  if (code === 368) return "APP_NOT_APPROVED"
  if (code === 100) return "INVALID_REQUEST"
  return "UNKNOWN"
}

export async function graphRequest<T>(
  config: MetaConfig,
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; token?: string; params?: Record<string, string>; body?: unknown } = {},
): Promise<GraphResult<T>> {
  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/${path.replace(/^\//, "")}`)
  for (const [k, v] of Object.entries(options.params ?? {})) url.searchParams.set(k, v)
  if (options.token) url.searchParams.set("appsecret_proof", hmacHex(config.appSecret, options.token))

  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.body !== undefined) headers["Content-Type"] = "application/json"

  let res: Response
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { ok: false, kind: "NETWORK", code: "network" }
  }

  const json = (await res.json().catch(() => null)) as ({ error?: { code?: number; error_subcode?: number } } & T) | null
  if (!res.ok || !json || json.error) {
    const code = json?.error?.code ?? res.status
    const subcode = json?.error?.error_subcode
    return { ok: false, kind: classify(code, subcode), code: subcode ? `${code}/${subcode}` : String(code) }
  }
  return { ok: true, data: json as T }
}
