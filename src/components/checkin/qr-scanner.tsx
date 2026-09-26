"use client"

import { useEffect, useRef, useState } from "react"
import { X, CameraOff } from "lucide-react"
import { Button } from "@/components/ui/button"

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> }

/**
 * Full-screen camera scanner for the door. Uses the phone's built-in QR detector where the browser has one
 * (Chrome on Android), and a small in-page decoder elsewhere (iPhone/iPad Safari). The same code is ignored for a
 * few seconds after a scan so one pass isn't read twice.
 */
export function QrScanner({ onScan, onClose, status }: { onScan: (text: string) => void; onClose: () => void; status: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onScanRef = useRef(onScan)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer: number | null = null
    let last = { text: "", at: 0 }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't use the camera. Type or paste the code instead.")
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      } catch {
        setError("Camera access was blocked. Allow the camera for this site in your browser settings, or type the code instead.")
        return
      }
      if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
      const video = videoRef.current!
      video.srcObject = stream
      video.setAttribute("playsinline", "true")
      await video.play().catch(() => undefined)

      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
      let detector: Detector | null = null
      if (Native) { try { detector = new Native({ formats: ["qr_code"] }) } catch { detector = null } }
      // jsQR ships as CommonJS; depending on the bundler the function is the module itself or its default export.
      const jsQR = detector ? null : await import("jsqr").then((m) => ((m as unknown as { default?: typeof m.default }).default ?? (m as unknown as typeof m.default)))

      const tick = async () => {
        if (stopped) return
        try {
          if (video.readyState >= 2 && video.videoWidth) {
            let text: string | null = null
            if (detector) {
              const found = await detector.detect(video)
              text = found[0]?.rawValue ?? null
            } else if (jsQR) {
              const canvas = canvasRef.current!
              const scale = Math.min(1, 640 / video.videoWidth)
              canvas.width = Math.round(video.videoWidth * scale)
              canvas.height = Math.round(video.videoHeight * scale)
              const ctx = canvas.getContext("2d", { willReadFrequently: true })!
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
              text = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null
            }
            const now = Date.now()
            if (text && (text !== last.text || now - last.at > 3000)) {
              last = { text, at: now }
              try { navigator.vibrate?.(40) } catch { /* not supported */ }
              onScanRef.current(text)
            }
          }
        } catch { /* keep scanning */ }
        timer = window.setTimeout(tick, 180)
      }
      tick()
    }
    start()
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Scan check-in passes">
      <div className="flex items-center justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm font-medium">Point the camera at a guest&apos;s check-in QR code</p>
        <Button size="sm" variant="secondary" onClick={onClose}><X className="size-4" /> Done</Button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <CameraOff className="size-10 opacity-80" aria-hidden />
            <p className="max-w-xs text-sm">{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="size-[min(70vw,18rem)] rounded-3xl border-4 border-white/85 shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]" />
            </div>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="min-h-28 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" aria-live="polite">{status}</div>
    </div>
  )
}
