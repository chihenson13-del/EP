/**
 * Browser side of error alerts: sends a short crash report to /api/client-error. Never includes the page's
 * query string, form contents or cookies, and sends each distinct error at most once per page load.
 */
const sent = new Set<string>()
let total = 0

export function reportClientError(error: unknown, extra?: { digest?: string }): void {
  try {
    if (typeof window === "undefined") return
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error")
    const message = `${err.name && err.name !== "Error" ? `${err.name}: ` : ""}${err.message || "Unknown error"}`.slice(0, 500)
    // Noise that isn't a bug in this site: browser extensions, cross-origin scripts, cancelled loads.
    if (/^Script error\.?$|ResizeObserver loop|chrome-extension:|moz-extension:|safari-extension:|Load failed|NetworkError|Failed to fetch|AbortError/i.test(`${message} ${err.stack ?? ""}`)) return
    const key = message.slice(0, 120)
    if (sent.has(key) || total >= 5) return
    sent.add(key)
    total++
    const body = JSON.stringify({
      message,
      stack: (err.stack ?? "").split("\n").slice(0, 8).join("\n").slice(0, 1500),
      path: window.location.pathname,
      digest: extra?.digest,
    })
    const blob = new Blob([body], { type: "application/json" })
    if (!navigator.sendBeacon?.("/api/client-error", blob)) {
      void fetch("/api/client-error", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined)
    }
  } catch {
    // Reporting must never cause another error.
  }
}
