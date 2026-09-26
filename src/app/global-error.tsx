"use client"

import { useEffect } from "react"
import { reportClientError } from "@/lib/report-client-error"

/** Last-resort error screen for crashes in the root layout itself (it replaces the whole page, so it has its own html/body). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Errors with a digest came from the server and are already in the error log; report browser crashes only.
    if (!error.digest) reportClientError(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#fff9f2", color: "#403447", padding: 16 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#756d78", fontSize: 14, marginBottom: 16 }}>The page couldn&apos;t load. It has been reported to us — please try again.</p>
          <button onClick={reset} style={{ padding: "10px 20px", borderRadius: 999, border: 0, background: "#6f5a86", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  )
}
