"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Download, QrCode } from "lucide-react"
import type { ResolvedTheme } from "@/lib/theme-resolve"
import { RADIUS_PX } from "@/lib/themes"

/**
 * A guest's personal check-in pass: a QR code the door team scans on the day. The code only identifies this guest
 * at this event (it isn't their RSVP link), and "Save image" puts it in the phone's photos for offline use.
 */
export function CheckInPass({ code, guestName, eventName, theme }: { code: string; guestName: string; eventName: string; theme: ResolvedTheme }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(code, { errorCorrectionLevel: "M", margin: 3, width: 720, color: { dark: "#1F1A24", light: "#FFFFFF" } })
      .then((url) => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc(null) })
    return () => { alive = false }
  }, [code])

  const file = `${eventName.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}-check-in-${guestName.replace(/[^a-z0-9]+/gi, "-").slice(0, 30)}.png`.toLowerCase()
  return (
    <div className="mx-auto w-full max-w-xs space-y-3 p-4 text-center" style={{ border: `1px dashed ${theme.colors.border}`, borderRadius: RADIUS_PX[theme.radius] }}>
      <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.colors.accent }}>
        <QrCode className="size-4" aria-hidden /> Your check-in pass
      </p>
      <div className="mx-auto aspect-square w-full max-w-[14rem] overflow-hidden rounded-lg bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt={`Check-in QR code for ${guestName}`} className="h-full w-full" /> : <div className="h-full w-full animate-pulse bg-neutral-100" />}
      </div>
      <p className="text-sm opacity-85">Show this at the entrance for a quick check-in.</p>
      {src && (
        <a href={src} download={file} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium underline-offset-4 hover:underline" style={{ color: theme.colors.accent }}>
          <Download className="size-4" aria-hidden /> Save image
        </a>
      )}
    </div>
  )
}
