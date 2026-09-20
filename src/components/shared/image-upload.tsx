"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ALLOWED_IMAGE_MIME } from "@/lib/image-url"

const MAX_BYTES = 5 * 1024 * 1024
/** Photos larger than this are downscaled and re-encoded in the browser before upload (typically 5MB -> ~300KB). */
const COMPRESS_ABOVE_BYTES = 350 * 1024
const MAX_DIMENSION = 1600

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("read failed"))
    reader.readAsDataURL(file)
  })
}

/**
 * Shrinks a large photo so uploads are fast and pages stay light. Falls back to the untouched original if the
 * browser can't decode/encode it or the result isn't smaller. Animated GIFs are never re-encoded.
 */
async function prepareImage(file: File, compress: boolean): Promise<string> {
  const original = () => readAsDataUrl(file)
  if (!compress || file.type === "image/gif" || file.size <= COMPRESS_ABOVE_BYTES) return original()
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) return original()
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    // JPEG stays JPEG; PNG/WebP become WebP so transparency survives.
    const wanted = file.type === "image/jpeg" ? "image/jpeg" : "image/webp"
    const encoded = canvas.toDataURL(wanted, 0.85)
    const originalUrl = await original()
    if (!encoded.startsWith(`data:${wanted}`) || encoded.length >= originalUrl.length) return originalUrl
    return encoded
  } catch {
    return original()
  }
}

/**
 * Client-side image upload: reads the file as a data URL and hands it to onUploaded.
 * Storage-provider-ready: swap the body of `handleFile` for an upload to S3/Cloudinary/etc.
 * and call onUploaded with the resulting CDN URL — everything downstream just expects a URL string.
 * The server re-validates every URL (see isSafeImageUrl), so this check is only for fast feedback.
 */
export function ImageUpload({ onUploaded, label = "Upload image", compress = true }: { onUploaded: (dataUrl: string) => void; label?: string; compress?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  function handleFile(file: File) {
    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) {
      toast.error("Please choose a PNG, JPG, WebP or GIF image.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("Please choose an image under 5MB.")
      return
    }
    setLoading(true)
    prepareImage(file, compress)
      .then((dataUrl) => onUploaded(dataUrl))
      .catch(() => toast.error("Couldn't read that file. Please try another image."))
      .finally(() => setLoading(false))
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
        <UploadCloud className="size-4" /> {loading ? "Uploading..." : label}
      </Button>
    </div>
  )
}
