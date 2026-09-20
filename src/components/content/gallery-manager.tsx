"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Trash2, Eye, EyeOff } from "lucide-react"
import { addGalleryImage, deleteGalleryImage, toggleGalleryImageVisibility } from "@/actions/content"
import { ImageUpload } from "@/components/shared/image-upload"
import { Button } from "@/components/ui/button"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type Image = { id: string; url: string; caption: string | null; hidden: boolean }

export function GalleryManager({ eventId, images }: { eventId: string; images: Image[] }) {
  const [list, setList] = useState(images)
  const [pending, startTransition] = useTransition()

  const once = useSingleFlight()
  function handleUpload(dataUrl: string) {
    startTransition(async () => {
      await once(async () => {
      const result = await safe(addGalleryImage(eventId, dataUrl))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => [...prev, { id: result.data.id, url: dataUrl, caption: null, hidden: false }])
      toast.success("Image added.")
    })
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await safe(deleteGalleryImage(eventId, id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.filter((i) => i.id !== id))
    })
  }

  function toggleHidden(id: string, hidden: boolean) {
    startTransition(async () => {
      const result = await safe(toggleGalleryImageVisibility(eventId, id, hidden))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.map((i) => (i.id === id ? { ...i, hidden } : i)))
    })
  }

  return (
    <div className="space-y-4">
      <ImageUpload onUploaded={handleUpload} label="Add photo" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {list.map((img) => (
          <div key={img.id} className="group relative rounded-lg overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption ?? ""} loading="lazy" decoding="async" className={`w-full aspect-square object-cover ${img.hidden ? "opacity-40" : ""}`} />
            {/* Revealed on hover for mouse users; always visible on touch screens, where an invisible overlay would swallow taps. */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-center justify-end gap-2">
              <Button size="icon" variant="secondary" className="size-8" disabled={pending} onClick={() => toggleHidden(img.id, !img.hidden)}>
                {img.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </Button>
              <Button size="icon" variant="destructive" className="size-8" disabled={pending} onClick={() => remove(img.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
