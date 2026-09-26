"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw, RotateCw, FlipHorizontal2, RefreshCcw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Aspect = "original" | "1:1" | "4:5" | "3:4" | "16:9"
type Look = "none" | "bw" | "warm" | "cool" | "vivid" | "soft" | "vintage"

type Edit = {
  aspect: Aspect
  rotation: 0 | 90 | 180 | 270
  straighten: number
  flip: boolean
  zoom: number
  offset: { x: number; y: number }
  brightness: number
  contrast: number
  saturation: number
  look: Look
}

const START: Edit = { aspect: "original", rotation: 0, straighten: 0, flip: false, zoom: 1, offset: { x: 0, y: 0 }, brightness: 0, contrast: 0, saturation: 0, look: "none" }

const LOOKS: Array<[Look, string, string]> = [
  ["none", "Original", ""],
  ["bw", "B&W", "grayscale(100%)"],
  ["warm", "Warm", "sepia(22%) saturate(115%)"],
  ["cool", "Cool", "hue-rotate(-12deg) saturate(92%)"],
  ["vivid", "Vivid", "saturate(145%) contrast(108%)"],
  ["soft", "Soft", "contrast(88%) brightness(106%)"],
  ["vintage", "Vintage", "sepia(45%) contrast(94%) brightness(104%)"],
]
const ASPECTS: Array<[Aspect, string]> = [["original", "Original"], ["1:1", "Square"], ["4:5", "4:5"], ["3:4", "3:4"], ["16:9", "16:9"]]
const MAX_OUTPUT = 1600

function ratioOf(aspect: Aspect, img: { w: number; h: number }): number {
  if (aspect === "original") return img.w / img.h
  const [a, b] = aspect.split(":").map(Number)
  return a / b
}

/** Draw the photo with every edit applied into a w×h frame. Used for both the live preview and the saved file. */
function render(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, e: Edit) {
  const turned = e.rotation % 180 !== 0
  const iw = turned ? img.naturalHeight : img.naturalWidth
  const ih = turned ? img.naturalWidth : img.naturalHeight
  const theta = (e.straighten * Math.PI) / 180
  // Enough extra scale that straightening never shows empty corners.
  const cornerFix = Math.abs(Math.cos(theta)) + Math.abs(Math.sin(theta)) * Math.max(w / h, h / w)
  const scale = Math.max(w / iw, h / ih) * e.zoom * cornerFix
  const look = LOOKS.find(([k]) => k === e.look)?.[2] ?? ""
  ctx.save()
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)
  if ("filter" in ctx) ctx.filter = `brightness(${100 + e.brightness}%) contrast(${100 + e.contrast}%) saturate(${100 + e.saturation}%) ${look}`.trim()
  ctx.translate(w / 2 + e.offset.x * w, h / 2 + e.offset.y * h)
  ctx.rotate(((e.rotation + e.straighten) * Math.PI) / 180)
  if (e.flip) ctx.scale(-1, 1)
  ctx.drawImage(img, (-img.naturalWidth * scale) / 2, (-img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale)
  ctx.restore()
}

/** How far the photo can be dragged before an edge would show (as a fraction of the frame). */
function maxOffset(img: HTMLImageElement, w: number, h: number, e: Edit) {
  const turned = e.rotation % 180 !== 0
  const iw = turned ? img.naturalHeight : img.naturalWidth
  const ih = turned ? img.naturalWidth : img.naturalHeight
  const scale = Math.max(w / iw, h / ih) * e.zoom
  return { x: Math.max(0, (iw * scale - w) / 2 / w), y: Math.max(0, (ih * scale - h) / 2 / h) }
}

/**
 * Photo editor for the gallery: crop to a shape, zoom and drag to frame, rotate / straighten / flip, a few looks,
 * brightness / contrast / saturation, and the caption. Everything happens in the browser; saving uploads one
 * finished image (max 1600px) that replaces the original.
 */
export function PhotoEditor({ open, src, caption, onClose, onSave }: { open: boolean; src: string; caption: string; onClose: () => void; onSave: (result: { dataUrl: string | null; caption: string }) => Promise<boolean> }) {
  const [edit, setEdit] = useState<Edit>(START)
  const [text, setText] = useState(caption)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<null | { x: number; y: number; start: { x: number; y: number } }>(null)
  const changed = JSON.stringify(edit) !== JSON.stringify(START)

  useEffect(() => {
    if (!open) return
    setEdit(START)
    setText(caption)
    setError(null)
    setImg(null)
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => setImg(image)
    image.onerror = () => setError("This photo couldn't be opened for editing. If it's a link to another website, download it and upload it here instead.")
    image.src = src
  }, [open, src, caption])

  const frame = img ? ratioOf(edit.aspect, { w: edit.rotation % 180 ? img.naturalHeight : img.naturalWidth, h: edit.rotation % 180 ? img.naturalWidth : img.naturalHeight }) : 1

  // Live preview.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const box = canvas.parentElement!.getBoundingClientRect()
    const maxW = Math.max(200, box.width)
    const maxH = Math.min(window.innerHeight * 0.45, 460)
    let w = maxW
    let h = w / frame
    if (h > maxH) { h = maxH; w = h * frame }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${Math.round(w)}px`
    canvas.style.height = `${Math.round(h)}px`
    const ctx = canvas.getContext("2d")
    if (ctx) render(ctx, img, canvas.width, canvas.height, edit)
  }, [img, edit, frame])

  const set = <K extends keyof Edit>(key: K, value: Edit[K]) => setEdit((e) => ({ ...e, [key]: value }))

  const clampOffset = useCallback((e: Edit, o: { x: number; y: number }) => {
    const canvas = canvasRef.current
    if (!canvas || !img) return o
    const m = maxOffset(img, canvas.width, canvas.height, e)
    return { x: Math.max(-m.x, Math.min(m.x, o.x)), y: Math.max(-m.y, Math.min(m.y, o.y)) }
  }, [img])

  async function save() {
    if (!img) return
    setSaving(true)
    try {
      let dataUrl: string | null = null
      if (changed) {
        const turnedW = edit.rotation % 180 ? img.naturalHeight : img.naturalWidth
        const turnedH = edit.rotation % 180 ? img.naturalWidth : img.naturalHeight
        const longest = Math.min(MAX_OUTPUT, Math.max(turnedW, turnedH))
        const w = frame >= 1 ? longest : Math.round(longest * frame)
        const h = frame >= 1 ? Math.round(longest / frame) : longest
        const out = document.createElement("canvas")
        out.width = w
        out.height = h
        const ctx = out.getContext("2d")!
        render(ctx, img, w, h, edit)
        try {
          dataUrl = out.toDataURL("image/jpeg", 0.88)
        } catch {
          setError("This photo is hosted on another website, so it can't be edited here. Download it and upload it instead.")
          return
        }
      }
      const ok = await onSave({ dataUrl, caption: text })
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  const slider = (label: string, key: "brightness" | "contrast" | "saturation" | "straighten", min: number, max: number, unit = "") => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><Label className="text-xs">{label}</Label><span className="tabular-nums text-muted-foreground">{edit[key] > 0 ? "+" : ""}{edit[key]}{unit}</span></div>
      <input type="range" min={min} max={max} step={1} value={edit[key]} onChange={(e) => set(key, Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label={label} />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[96dvh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit photo</DialogTitle>
          <DialogDescription>Drag the photo to frame it. Saving replaces the photo in your gallery.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_15rem]">
          <div className="min-w-0 space-y-3">
            <div className="flex min-h-48 items-center justify-center rounded-lg bg-[repeating-conic-gradient(#f1eee9_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2">
              {error ? <p className="p-6 text-center text-sm text-destructive">{error}</p>
                : !img ? <p className="p-6 text-sm text-muted-foreground">Opening photo…</p>
                  : (
                    <canvas
                      ref={canvasRef}
                      className="max-w-full cursor-grab touch-none rounded shadow-sm active:cursor-grabbing"
                      onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, start: edit.offset } }}
                      onPointerMove={(e) => {
                        const d = drag.current
                        const canvas = canvasRef.current
                        if (!d || !canvas) return
                        const r = canvas.getBoundingClientRect()
                        const next = { x: d.start.x + (e.clientX - d.x) / r.width, y: d.start.y + (e.clientY - d.y) / r.height }
                        setEdit((cur) => ({ ...cur, offset: clampOffset(cur, next) }))
                      }}
                      onPointerUp={() => { drag.current = null }}
                      onPointerCancel={() => { drag.current = null }}
                      aria-label="Photo preview — drag to reposition"
                    />
                  )}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Crop shape">
              {ASPECTS.map(([key, label]) => (
                <Button key={key} size="sm" variant={edit.aspect === key ? "secondary" : "outline"} className="h-8" onClick={() => setEdit((e) => ({ ...e, aspect: key, offset: { x: 0, y: 0 } }))} aria-pressed={edit.aspect === key}>{label}</Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setEdit((e) => ({ ...e, rotation: ((e.rotation + 270) % 360) as Edit["rotation"], offset: { x: 0, y: 0 } }))}><RotateCcw className="size-4" /> Left</Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setEdit((e) => ({ ...e, rotation: ((e.rotation + 90) % 360) as Edit["rotation"], offset: { x: 0, y: 0 } }))}><RotateCw className="size-4" /> Right</Button>
              <Button size="sm" variant={edit.flip ? "secondary" : "outline"} className="h-8" onClick={() => set("flip", !edit.flip)} aria-pressed={edit.flip}><FlipHorizontal2 className="size-4" /> Flip</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setEdit(START)} disabled={!changed}><RefreshCcw className="size-4" /> Reset</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs"><Label className="text-xs">Zoom</Label><span className="tabular-nums text-muted-foreground">{Math.round(edit.zoom * 100)}%</span></div>
              <input type="range" min={100} max={300} step={1} value={Math.round(edit.zoom * 100)} onChange={(e) => setEdit((cur) => { const next = { ...cur, zoom: Number(e.target.value) / 100 }; return { ...next, offset: clampOffset(next, cur.offset) } })} className="w-full accent-[var(--primary)]" aria-label="Zoom" />
            </div>
            {slider("Straighten", "straighten", -15, 15, "°")}
            {slider("Brightness", "brightness", -50, 50)}
            {slider("Contrast", "contrast", -50, 50)}
            {slider("Saturation", "saturation", -100, 100)}
            <div className="space-y-1.5">
              <Label className="text-xs">Look</Label>
              <div className="grid grid-cols-4 gap-1.5 md:grid-cols-2">
                {LOOKS.map(([key, label]) => (
                  <button key={key} type="button" onClick={() => set("look", key)} aria-pressed={edit.look === key}
                    className={cn("h-8 rounded-md border text-xs font-medium cursor-pointer", edit.look === key ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-caption" className="text-xs">Caption</Label>
              <Input id="photo-caption" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || !img || !!error}>{saving ? "Saving…" : changed ? "Save photo" : "Save caption"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
