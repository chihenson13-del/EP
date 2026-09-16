"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { toast } from "sonner"
import { Copy, Download, Share2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function QrCodeCard({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: "#403447", light: "#ffffff" } }).then(setDataUrl)
  }, [url])

  function copyLink() {
    navigator.clipboard.writeText(url)
    toast.success("Link copied.")
  }

  function downloadQr() {
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = "event-qr-code.png"
    a.click()
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ url, title: "Event invitation" }).catch(() => {})
    } else {
      copyLink()
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">QR Code &amp; Sharing</CardTitle></CardHeader>
      <CardContent className="flex items-center gap-4">
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Event QR code" className="size-28 rounded-lg border" />
        )}
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyLink}><Copy className="size-3.5" /> Copy</Button>
            <Button size="sm" variant="outline" onClick={downloadQr}><Download className="size-3.5" /> Download</Button>
            <Button size="sm" variant="outline" onClick={share}><Share2 className="size-3.5" /> Share</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
