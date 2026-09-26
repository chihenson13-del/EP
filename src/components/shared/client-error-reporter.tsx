"use client"

import { useEffect } from "react"
import { reportClientError } from "@/lib/report-client-error"

/** Reports unexpected script errors that don't reach an error screen (e.g. a button handler that throws). */
export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Only errors from this site's own scripts.
      if (event.filename && !event.filename.startsWith(window.location.origin)) return
      reportClientError(event.error ?? event.message)
    }
    const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
