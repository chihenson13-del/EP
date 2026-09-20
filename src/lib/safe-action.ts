import type { ActionResult } from "@/actions/events"

/**
 * Wraps a server-action call made from the browser so it can never reject. A dropped connection, a server
 * error, or an expired session becomes an ordinary `{ ok: false, error }` result — the caller's existing
 * error toast runs and its "Saving…" state resets instead of the button sticking forever.
 */
export async function safe<T>(call: Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await call
  } catch {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false
    return {
      ok: false,
      error: offline ? "You appear to be offline. Check your connection and try again." : "Something went wrong. Please try again.",
    }
  }
}
