"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Trash2, Eye, EyeOff } from "lucide-react"
import { addGalleryImage, deleteGalleryImage, toggleGalleryImageVisibility } from "@/actions/content"
import { ImageUpload } from "@/components/shared/image-upload"
import { Button } from "@/components/ui/button"

type Image = { id: string; url: string; caption: string | null; hidden: boolean }

export function GalleryManager({ eventId, images }: { eventId: string; images: Image[] }) {
  const [list, setList] = useState(images)
  const [pending, startTransition] = useTransition()

  function handleUpload(dataUrl: string) {
    startTransition(async () => {
      const result = await addGalleryImage(eventId, dataUrl)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => [...prev, { id: result.data.id, url: dataUrl, caption: null, hidden: false }])
      toast.success("Image added.")
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteGalleryImage(eventId, id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.filter((i) => i.id !== id))
    })
  }

  function toggleHidden(id: string, hidden: boolean) {
    startTransition(async () => {
      await toggleGalleryImageVisibility(eventId, id, hidden)
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
            <img src={img.url} alt={img.caption ?? ""} className={`w-full aspect-square object-cover ${img.hidden ? "opacity-40" : ""}`} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
