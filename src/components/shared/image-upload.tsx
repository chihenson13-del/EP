"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ALLOWED_IMAGE_MIME } from "@/lib/image-url"

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Client-side image upload: reads the file as a data URL and hands it to onUploaded.
 * Storage-provider-ready: swap the body of `handleFile` for an upload to S3/Cloudinary/etc.
 * and call onUploaded with the resulting CDN URL — everything downstream just expects a URL string.
 * The server re-validates every URL (see isSafeImageUrl), so this check is only for fast feedback.
 */
export function ImageUpload({ onUploaded, label = "Upload image" }: { onUploaded: (dataUrl: string) => void; label?: string }) {
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
    const reader = new FileReader()
    reader.onload = () => {
      onUploaded(reader.result as string)
      setLoading(false)
    }
    reader.onerror = () => {
      setLoading(false)
      toast.error("Couldn't read that file. Please try another image.")
    }
    reader.readAsDataURL(file)
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
