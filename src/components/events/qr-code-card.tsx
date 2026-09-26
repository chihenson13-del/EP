"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { toast } from "sonner"
import { Copy, Download, Share2, Printer, ImageDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** 1600px with a 4-module quiet zone: sharp when printed up to ~13cm at 300dpi, and reliably scannable. */
const EXPORT_SIZE = 1600
const QR_OPTIONS = { errorCorrectionLevel: "Q" as const, margin: 4, color: { dark: "#1F1A24", light: "#FFFFFF" } }

function fileName(url: string): string {
  const slug = url.split("/").filter(Boolean).pop() || "event"
  return `${slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 60)}-qr-code.png`
}

/** Copy text with the Clipboard API, falling back to a hidden textarea for older/in-app browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    ta.remove()
    return ok
  }
}

const isIOS = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))

/**
 * Event QR code with working actions: Download PNG (a real high-resolution file), Save image / Share (the
 * system share sheet with the PNG where supported, e.g. "Save Image" on iPhone), Share link, Copy link, Print.
 * The PNG contains only the QR code on white — nothing else.
 */
export function QrCodeCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [canShareFile, setCanShareFile] = useState(false)
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const pngRef = useRef<Blob | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = document.createElement("canvas")
    QRCode.toCanvas(canvas, url, { ...QR_OPTIONS, width: EXPORT_SIZE })
      .then(() => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png")))
      .then((blob) => {
        if (cancelled || !blob) return
        pngRef.current = blob
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = URL.createObjectURL(blob)
        setPreview(objectUrlRef.current)
        const file = new File([blob], fileName(url), { type: "image/png" })
        setCanShareFile(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }))
      })
      .catch(() => toast.error("Couldn't generate the QR code."))
    return () => { cancelled = true }
  }, [url])

  // Release the image memory when the card goes away.
  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current) }, [])

  async function copyLink() {
    if (await copyText(url)) toast.success("Invitation link copied.")
    else toast.error("Couldn't copy automatically. Select the link above and copy it.")
  }

  function downloadPng() {
    const blob = pngRef.current
    if (!blob) return toast.error("The QR code is still being prepared.")
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = fileName(url)
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    // iOS Safari may show the file instead of saving it; offer the dependable Save Image route as well.
    if (isIOS()) setTimeout(() => setFallbackOpen(true), 600)
    else toast.success("QR code downloaded.")
  }

  async function shareImage() {
    const blob = pngRef.current
    if (!blob) return
    const file = new File([blob], fileName(url), { type: "image/png" })
    try {
      await navigator.share({ files: [file], title: "Event QR code" })
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setFallbackOpen(true)
    }
  }

  async function shareLink() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: "You're invited" })
        return
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return
      }
    }
    if (await copyText(url)) toast.success("Sharing isn't available here, so the link was copied instead.")
  }

  function print() {
    if (!preview) return
    const frame = document.createElement("iframe")
    frame.style.position = "fixed"
    frame.style.width = "0"
    frame.style.height = "0"
    frame.style.border = "0"
    document.body.appendChild(frame)
    const doc = frame.contentDocument!
    doc.open()
    doc.write(`<!doctype html><title>QR code</title><style>@page{margin:15mm}body{margin:0;display:flex;justify-content:center;align-items:center;height:95vh}img{width:120mm;height:120mm}</style><img src="${preview}" alt="QR code">`)
    doc.close()
    const img = doc.querySelector("img")!
    const go = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000) }
    if (img.complete) go()
    else img.onload = go
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">QR Code &amp; Sharing</CardTitle></CardHeader>
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Event QR code" className="size-32 rounded-lg border bg-white shrink-0" />
        ) : (
          <div className="size-32 rounded-lg border bg-muted animate-pulse shrink-0" aria-label="Generating QR code" />
        )}
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-xs text-muted-foreground break-all">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={downloadPng} disabled={!preview}><Download className="size-3.5" /> Download QR</Button>
            {canShareFile && <Button size="sm" variant="outline" onClick={shareImage} disabled={!preview}><ImageDown className="size-3.5" /> Save image / Share</Button>}
            <Button size="sm" variant="outline" onClick={shareLink}><Share2 className="size-3.5" /> Share QR link</Button>
            <Button size="sm" variant="outline" onClick={copyLink}><Copy className="size-3.5" /> Copy QR link</Button>
            <Button size="sm" variant="outline" onClick={print} disabled={!preview}><Printer className="size-3.5" /> Print</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Downloads a {EXPORT_SIZE}×{EXPORT_SIZE} PNG — sharp enough to print.</p>
        </div>
      </CardContent>

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save the QR code</DialogTitle>
            <DialogDescription>
              {canShareFile ? "Tap “Save image / Share”, then choose Save Image. Or press and hold the code below and choose Save to Photos." : "Press and hold the code below, then choose Save Image / Save to Photos."}
            </DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Event QR code" className="w-full rounded-lg border bg-white" />}
          {canShareFile && <Button onClick={shareImage}><ImageDown className="size-4" /> Save image / Share</Button>}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
