import { NextResponse } from "next/server"
import { recordError } from "@/lib/error-alerts"
import { rateLimit, clientIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Receives crash reports from browsers (the page's error screen and unexpected script errors). Reports are
 * small, rate limited per visitor, only logged (browser errors are emailed in the daily summary, never
 * instantly), and must come from this site's own pages.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin")
  const host = req.headers.get("host")
  if (origin && host && new URL(origin).host !== host) return new NextResponse(null, { status: 403 })

  const limited = await rateLimit(`client-error:${clientIp(req.headers)}`, 20, 60 * 60)
  if (!limited.ok) return new NextResponse(null, { status: 429 })

  const raw = await req.text().catch(() => "")
  if (!raw || raw.length > 8000) return new NextResponse(null, { status: 400 })
  let body: { message?: unknown; stack?: unknown; path?: unknown; digest?: unknown }
  try { body = JSON.parse(raw) } catch { return new NextResponse(null, { status: 400 }) }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : ""
  if (!message) return new NextResponse(null, { status: 400 })
  const error = new Error(message)
  error.name = "BrowserError"
  const stack = typeof body.stack === "string" ? body.stack.slice(0, 1500) : ""
  const digest = typeof body.digest === "string" ? body.digest.slice(0, 40) : ""
  error.stack = `BrowserError: ${message}\n${digest ? `    digest ${digest}\n` : ""}${stack}`
  await recordError({ source: "client", error, path: typeof body.path === "string" ? body.path : null })
  return new NextResponse(null, { status: 204 })
}
