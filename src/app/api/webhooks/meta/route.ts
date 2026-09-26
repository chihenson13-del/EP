import { NextResponse } from "next/server"
import { getMetaConfig } from "@/lib/messenger/config"
import { isValidMetaSignature, safeEqual } from "@/lib/messenger/crypto"
import { handleWebhook } from "@/lib/messenger/meta-messenger-service"

export const dynamic = "force-dynamic"

/**
 * Meta Messenger webhook.
 * GET  — Meta's verification handshake (hub.mode=subscribe, hub.verify_token, hub.challenge).
 * POST — event notifications; rejected unless X-Hub-Signature-256 matches the raw body signed with the app secret.
 * While the integration is off, both return 404 so nothing is processed.
 */
export async function GET(req: Request) {
  const status = getMetaConfig()
  if (!status.live) return new NextResponse("Not found", { status: 404 })
  const url = new URL(req.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token") ?? ""
  const challenge = url.searchParams.get("hub.challenge") ?? ""
  if (mode === "subscribe" && safeEqual(token, status.config.webhookVerifyToken) && /^[\w-]{1,200}$/.test(challenge)) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } })
  }
  return new NextResponse("Forbidden", { status: 403 })
}

export async function POST(req: Request) {
  const status = getMetaConfig()
  if (!status.live) return new NextResponse("Not found", { status: 404 })

  const raw = Buffer.from(await req.arrayBuffer())
  if (raw.length > 1_000_000) return new NextResponse("Payload too large", { status: 413 })
  if (!isValidMetaSignature(raw, req.headers.get("x-hub-signature-256"), status.config.appSecret)) {
    return new NextResponse("Invalid signature", { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw.toString("utf8"))
  } catch {
    return new NextResponse("Bad request", { status: 400 })
  }

  // Meta expects 200 within 5 seconds. Processing is small (a few indexed writes); errors are swallowed so a bad
  // event can't make Meta retry forever, and duplicates are ignored by the replay table.
  try {
    await handleWebhook(payload)
  } catch (error) {
    console.error("[meta-webhook] processing failed", error instanceof Error ? error.message : "unknown")
  }
  return new NextResponse("EVENT_RECEIVED", { status: 200 })
}
