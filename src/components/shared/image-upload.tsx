"use client"

import { useRef, useState } from "react"
import { UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Client-side image upload: reads the file as a data URL and hands it to onUploaded.
 * Storage-provider-ready: swap the body of `handleFile` for an upload to S3/Cloudinary/etc.
 * and call onUploaded with the resulting CDN URL — everything downstream just expects a URL string.
 */
export function ImageUpload({ onUploaded, label = "Upload image" }: { onUploaded: (dataUrl: string) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image under 5MB.")
      return
    }
    setLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      onUploaded(reader.result as string)
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
        <UploadCloud className="size-4" /> {loading ? "Uploading..." : label}
      </Button>
    </div>
  )
}
