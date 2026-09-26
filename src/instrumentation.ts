import type { Instrumentation } from "next"

export function register() {}

/**
 * Next.js calls this for every error thrown while rendering a page, running a server action or an API route.
 * The error is logged to the admin error log and, throttled, emailed to the admins (src/lib/error-alerts.ts).
 * Only the route pattern (e.g. /events/[slug]/rsvp/[token]) is recorded — never the real URL, headers or body.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { recordError } = await import("@/lib/error-alerts")
  const where = context.routePath || request.path
  await recordError({ source: "server", error, path: `${request.method} ${where}`.trim() })
}
