"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Trash2, Eye, EyeOff, Pencil, ChevronLeft, ChevronRight, GripVertical } from "lucide-react"
import { addGalleryImage, deleteGalleryImage, toggleGalleryImageVisibility, updateGalleryImage, reorderGallery } from "@/actions/content"
import { ImageUpload } from "@/components/shared/image-upload"
import { Button } from "@/components/ui/button"
import { PhotoEditor } from "@/components/content/photo-editor"
import { cn } from "@/lib/utils"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type Image = { id: string; url: string; caption: string | null; hidden: boolean }

/**
 * The event's photo gallery: upload, edit (crop, rotate, straighten, looks, caption), reorder (drag, or the arrow
 * buttons on touch screens), hide from guests, delete. The order here is the order guests see.
 */
export function GalleryManager({ eventId, images }: { eventId: string; images: Image[] }) {
  const [list, setList] = useState(images)
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const editing = editingId ? list.find((i) => i.id === editingId) ?? null : null

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
        toast.success("Photo added.")
      })
    })
  }

  function remove(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await safe(deleteGalleryImage(eventId, id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.filter((i) => i.id !== id))
      toast.success("Photo deleted.")
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

  function persistOrder(next: Image[]) {
    const before = list
    setList(next)
    startTransition(async () => {
      const result = await safe(reorderGallery(eventId, next.map((i) => i.id)))
      if (!result.ok) {
        setList(before)
        toast.error(`Couldn't save the new order: ${result.error}`)
      }
    })
  }

  function move(id: string, delta: -1 | 1) {
    const from = list.findIndex((i) => i.id === id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= list.length) return
    const next = [...list]
    ;[next[from], next[to]] = [next[to], next[from]]
    persistOrder(next)
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return
    const next = list.filter((i) => i.id !== dragId)
    const moved = list.find((i) => i.id === dragId)!
    next.splice(next.findIndex((i) => i.id === targetId), 0, moved)
    setDragId(null)
    persistOrder(next)
  }

  async function saveEdit(id: string, result: { dataUrl: string | null; caption: string }): Promise<boolean> {
    const res = await safe(updateGalleryImage(eventId, id, { ...(result.dataUrl ? { url: result.dataUrl } : {}), caption: result.caption }))
    if (!res.ok) { toast.error(res.error); return false }
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, url: result.dataUrl ?? i.url, caption: result.caption.trim() || null } : i)))
    toast.success(result.dataUrl ? "Photo saved." : "Caption saved.")
    return true
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ImageUpload onUploaded={handleUpload} label="Add photo" />
        {list.length > 1 && <p className="text-xs text-muted-foreground">Drag photos (or use the arrows) to change the order guests see.</p>}
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {list.map((img, index) => (
          <li
            key={img.id}
            draggable
            onDragStart={(e) => { setDragId(img.id); e.dataTransfer.effectAllowed = "move" }}
            onDragOver={(e) => { if (dragId) e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); dropOn(img.id) }}
            onDragEnd={() => setDragId(null)}
            className={cn("group relative min-w-0 overflow-hidden rounded-lg border bg-card", dragId === img.id && "opacity-50 ring-2 ring-primary")}
          >
            <button type="button" className="block w-full cursor-pointer" onClick={() => setEditingId(img.id)} aria-label={`Edit photo ${index + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption ?? ""} loading="lazy" decoding="async" className={cn("w-full aspect-square object-cover", img.hidden && "opacity-40")} />
            </button>
            <span className="pointer-events-none absolute left-1.5 top-1.5 hidden items-center rounded bg-black/50 px-1 text-white sm:flex" aria-hidden><GripVertical className="size-3.5" /></span>
            {img.hidden && <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Hidden</span>}
            <div className="space-y-1.5 p-2">
              <p className={cn("min-h-4 truncate text-xs", img.caption ? "" : "text-muted-foreground")}>{img.caption || "No caption"}</p>
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" className="size-8" disabled={pending || index === 0} onClick={() => move(img.id, -1)} aria-label="Move earlier"><ChevronLeft className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="size-8" disabled={pending || index === list.length - 1} onClick={() => move(img.id, 1)} aria-label="Move later"><ChevronRight className="size-4" /></Button>
                </div>
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditingId(img.id)} aria-label="Edit photo"><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="size-8" disabled={pending} onClick={() => toggleHidden(img.id, !img.hidden)} aria-label={img.hidden ? "Show to guests" : "Hide from guests"}>
                    {img.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                  <Button size="icon" variant={confirmDelete === img.id ? "destructive" : "ghost"} className="size-8" disabled={pending} onClick={() => remove(img.id)} aria-label={confirmDelete === img.id ? "Tap again to delete" : "Delete photo"} title={confirmDelete === img.id ? "Tap again to delete" : "Delete"}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {confirmDelete === img.id && <p className="text-[11px] text-destructive">Tap the bin again to delete.</p>}
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <PhotoEditor
          open={!!editing}
          src={editing.url}
          caption={editing.caption ?? ""}
          onClose={() => setEditingId(null)}
          onSave={(result) => saveEdit(editing.id, result)}
        />
      )}
    </div>
  )
}
