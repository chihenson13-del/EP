"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Type, Square, Circle, ImageIcon, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  Trash2, Copy, Lock, LockOpen, Eye, EyeOff, ChevronUp, ChevronDown, ArrowUpToLine, ArrowDownToLine,
  Smartphone, Monitor, Save,
} from "lucide-react"
import { saveDesign } from "@/actions/design"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/shared/image-upload"
import { DesignObjectNode } from "@/components/editor/design-object-node"
import type { DesignObject, CanvasData } from "@/components/editor/types"

import { safe } from "@/lib/safe-action"
const nanoidLike = () => Math.random().toString(36).slice(2, 10)

export function InvitationEditor({ eventId, design }: { eventId: string; design: { width: number; height: number; canvasJson: unknown } }) {
  const initial: CanvasData = (design.canvasJson as CanvasData) ?? { objects: [] }
  const [objects, setObjects] = useState<DesignObject[]>(initial.objects ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState({ x: -60, y: -60, w: design.width + 120, h: design.height + 120 })
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  // Bumped when edits arrived while a save was in flight, so the debounced autosave is re-armed for them.
  const [resaveTick, setResaveTick] = useState(0)
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)
  // Latest objects for the autosave/preview handlers (state is replaced, never mutated).
  const objectsRef = useRef(objects)
  const savingRef = useRef(false)
  const moveFrame = useRef<number | null>(null)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const historyRef = useRef<DesignObject[][]>([])
  const redoRef = useRef<DesignObject[][]>([])
  const dragRef = useRef<null | { kind: "move" | "resize" | "rotate"; id: string; startSvg: { x: number; y: number }; start: DesignObject }>(null)

  const selected = objects.find((o) => o.id === selectedId) ?? null

  useEffect(() => {
    objectsRef.current = objects
  })

  // History keeps references to earlier arrays (objects are replaced, never mutated) — no deep clones of
  // embedded images on every click.
  const snapshot = useCallback(() => {
    historyRef.current.push(objectsRef.current)
    if (historyRef.current.length > 50) historyRef.current.shift()
    redoRef.current = []
  }, [])

  function commit(next: DesignObject[]) {
    objectsRef.current = next
    setObjects(next)
    setDirty(true)
    setSaveFailed(false)
  }

  function undo() {
    const prev = historyRef.current.pop()
    if (!prev) return
    redoRef.current.push(objects)
    commit(prev)
  }
  function redo() {
    const next = redoRef.current.pop()
    if (!next) return
    historyRef.current.push(objects)
    commit(next)
  }

  /** Save the current design. Returns true when the server confirmed it. */
  const save = useCallback(async (opts?: { silent?: boolean }): Promise<boolean> => {
    if (savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    const snapshotAtSave = objectsRef.current
    const result = await safe(saveDesign(eventId, { objects: snapshotAtSave }))
    savingRef.current = false
    setSaving(false)
    if (!result.ok) {
      setSaveFailed(true)
      toast.error(`Save failed: ${result.error}`)
      return false
    }
    // If the user kept editing while the request ran, keep the design marked as changed and schedule another save.
    if (objectsRef.current === snapshotAtSave) setDirty(false)
    else setResaveTick((t) => t + 1)
    setSaveFailed(false)
    if (!opts?.silent) toast.success("Design saved.")
    return true
  }, [eventId])

  // Debounced autosave: local edits stay instant; the database is written once the user pauses.
  useEffect(() => {
    if (!dirty || saveFailed) return
    const timer = setTimeout(() => { void save({ silent: true }) }, 2500)
    return () => clearTimeout(timer)
  }, [objects, dirty, saveFailed, save, resaveTick])

  // Don't let unsaved work vanish silently.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  async function openPreview() {
    if (dirty && !(await save({ silent: true }))) return
    router.push(`/dashboard/events/${eventId}/preview`)
  }

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  function addObject(type: DesignObject["type"]) {
    snapshot()
    const base: DesignObject = {
      id: nanoidLike(), type, x: design.width / 2 - 80, y: design.height / 2 - 40, width: 160, height: 80,
      rotation: 0, zIndex: objects.length,
      ...(type === "text" ? { text: "Double-click to edit", fontSize: 28, color: "#403447", fontWeight: 700, align: "center" } : {}),
      ...(type === "rect" ? { fill: "#f3e8dc", rx: 8 } : {}),
      ...(type === "ellipse" ? { fill: "#f3e8dc" } : {}),
      ...(type === "image" ? { src: "", width: 200, height: 200 } : {}),
    }
    commit([...objects, base])
    setSelectedId(base.id)
  }

  function updateSelected(patch: Partial<DesignObject>) {
    if (!selected) return
    commit(objects.map((o) => (o.id === selected.id ? { ...o, ...patch } : o)))
  }

  const beginMove = useCallback((obj: DesignObject, e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    if (obj.locked) return setSelectedId(obj.id)
    snapshot()
    setSelectedId(obj.id)
    dragRef.current = { kind: "move", id: obj.id, startSvg: toSvgPoint(e.clientX, e.clientY), start: obj }
  }, [snapshot])
  const beginResize = useCallback((obj: DesignObject, e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    snapshot()
    dragRef.current = { kind: "resize", id: obj.id, startSvg: toSvgPoint(e.clientX, e.clientY), start: obj }
  }, [snapshot])
  const beginRotate = useCallback((obj: DesignObject, e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    snapshot()
    dragRef.current = { kind: "rotate", id: obj.id, startSvg: toSvgPoint(e.clientX, e.clientY), start: obj }
  }, [snapshot])

  /** Apply the latest pointer position; runs at most once per animation frame. */
  function applyDrag() {
    moveFrame.current = null
    const drag = dragRef.current
    const pointer = lastPointer.current
    if (!drag || !pointer) return
    const p = toSvgPoint(pointer.x, pointer.y)
    const dx = p.x - drag.startSvg.x
    const dy = p.y - drag.startSvg.y

    let patch: Partial<DesignObject>
    if (drag.kind === "move") {
      patch = { x: drag.start.x + dx, y: drag.start.y + dy }
    } else if (drag.kind === "resize") {
      patch = { width: Math.max(20, drag.start.width + dx), height: Math.max(20, drag.start.height + dy) }
    } else {
      const cx = drag.start.x + drag.start.width / 2
      const cy = drag.start.y + drag.start.height / 2
      patch = { rotation: Math.round((Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90) }
    }
    const next = objectsRef.current.map((o) => (o.id === drag.id ? { ...o, ...patch } : o))
    objectsRef.current = next
    setObjects(next)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    lastPointer.current = { x: e.clientX, y: e.clientY }
    if (moveFrame.current === null) moveFrame.current = requestAnimationFrame(applyDrag)
  }

  function handlePointerUp() {
    if (!dragRef.current) return
    if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current)
    applyDrag()
    dragRef.current = null
    setDirty(true)
    setSaveFailed(false)
  }

  function zoom(factor: number) {
    setViewBox((v) => {
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2
      const w = Math.max(200, Math.min(v.w * factor, design.width * 3))
      const h = w * (v.h / v.w)
      return { x: cx - w / 2, y: cy - h / 2, w, h }
    })
  }
  function fit() {
    setViewBox({ x: -60, y: -60, w: design.width + 120, h: design.height + 120 })
  }

  function duplicateSelected() {
    if (!selected) return
    snapshot()
    const copy = { ...selected, id: nanoidLike(), x: selected.x + 20, y: selected.y + 20, zIndex: objects.length }
    commit([...objects, copy])
    setSelectedId(copy.id)
  }
  function deleteSelected() {
    if (!selected) return
    snapshot()
    commit(objects.filter((o) => o.id !== selected.id))
    setSelectedId(null)
  }
  function reorder(dir: "front" | "back" | "forward" | "backward") {
    if (!selected) return
    const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex)
    const idx = sorted.findIndex((o) => o.id === selected.id)
    sorted.splice(idx, 1)
    if (dir === "front") sorted.push(selected)
    else if (dir === "back") sorted.unshift(selected)
    else if (dir === "forward") sorted.splice(Math.min(idx + 1, sorted.length), 0, selected)
    else sorted.splice(Math.max(idx - 1, 0), 0, selected)
    commit(sorted.map((o, i) => ({ ...o, zIndex: i })))
  }

  const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex)
  const previewWidth = preview === "mobile" ? 375 : design.width

  return (
    <div className="flex flex-col lg:h-[calc(100vh-6rem)]">
      <div className="flex flex-wrap items-center gap-1.5 border-b bg-card p-2">
        <Button size="sm" variant="outline" onClick={() => addObject("text")}><Type className="size-3.5" /> Text</Button>
        <Button size="sm" variant="outline" onClick={() => addObject("rect")}><Square className="size-3.5" /> Shape</Button>
        <Button size="sm" variant="outline" onClick={() => addObject("ellipse")}><Circle className="size-3.5" /> Circle</Button>
        <Button size="sm" variant="outline" onClick={() => addObject("image")}><ImageIcon className="size-3.5" /> Image</Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="icon" variant="ghost" className="size-8" onClick={undo}><Undo2 className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={redo}><Redo2 className="size-4" /></Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(0.8)}><ZoomIn className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(1.25)}><ZoomOut className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={fit}><Maximize className="size-4" /></Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="icon" variant={preview === "desktop" ? "secondary" : "ghost"} className="size-8" onClick={() => setPreview("desktop")}><Monitor className="size-4" /></Button>
        <Button size="icon" variant={preview === "mobile" ? "secondary" : "ghost"} className="size-8" onClick={() => setPreview("mobile")}><Smartphone className="size-4" /></Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={openPreview} disabled={saving}><Eye className="size-3.5" /> Preview</Button>
        <Button size="sm" onClick={() => save()} disabled={saving} variant={saveFailed ? "destructive" : "default"}>
          <Save className="size-3.5" /> {saving ? "Saving..." : saveFailed ? "Save failed — retry" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      {/* Canvas above the properties panel on phones; side by side from lg up. */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-0">
        <div className="h-[55vh] lg:h-auto flex-1 bg-secondary/20 overflow-hidden flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="touch-none select-none"
            style={{ width: "100%", height: "100%", maxWidth: previewWidth + 120 }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerDown={() => setSelectedId(null)}
          >
            <rect x={0} y={0} width={design.width} height={design.height} fill="#ffffff" stroke="#00000015" />
            {preview === "mobile" && <rect x={0} y={0} width={375} height={design.height} fill="none" stroke="var(--brand-purple-deep)" strokeDasharray="6 4" strokeWidth={1.5} />}
            {sortedObjects.map((obj) => (
              <DesignObjectNode
                key={obj.id}
                object={obj}
                selected={selectedId === obj.id}
                onPointerDown={beginMove}
                onResizeStart={beginResize}
                onRotateStart={beginRotate}
              />
            ))}
          </svg>
        </div>

        <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l bg-card overflow-y-auto max-h-[50vh] lg:max-h-none">
          {selected ? (
            <ObjectPanel
              object={selected}
              onChange={updateSelected}
              onDuplicate={duplicateSelected}
              onDelete={deleteSelected}
              onReorder={reorder}
            />
          ) : (
            <div className="p-4 space-y-2">
              <p className="font-medium text-sm">Layers</p>
              {sortedObjects.length === 0 && <p className="text-xs text-muted-foreground">Add text, shapes, or images to get started.</p>}
              <div className="space-y-1">
                {[...sortedObjects].reverse().map((o) => (
                  <button key={o.id} onClick={() => setSelectedId(o.id)} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-secondary text-left">
                    {o.type === "text" ? <Type className="size-3.5" /> : o.type === "image" ? <ImageIcon className="size-3.5" /> : <Square className="size-3.5" />}
                    <span className="truncate flex-1">{o.type === "text" ? o.text : o.type}</span>
                    {o.locked && <Lock className="size-3 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ObjectPanel({
  object, onChange, onDuplicate, onDelete, onReorder,
}: { object: DesignObject; onChange: (patch: Partial<DesignObject>) => void; onDuplicate: () => void; onDelete: () => void; onReorder: (dir: "front" | "back" | "forward" | "backward") => void }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm capitalize">{object.type} settings</p>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onChange({ locked: !object.locked })}>{object.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}</Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onChange({ hidden: !object.hidden })}>{object.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
        </div>
      </div>

      {object.type === "text" && (
        <>
          <Field label="Text"><Textarea rows={3} value={object.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} /></Field>
          <Field label="Font size"><Input type="number" value={object.fontSize ?? 24} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} /></Field>
          <Field label="Color"><Input type="color" value={toHex(object.color, "#403447")} onChange={(e) => onChange({ color: e.target.value })} className="h-9 p-1" /></Field>
          <Field label="Alignment">
            <Select value={object.align ?? "center"} onValueChange={(v) => onChange({ align: v as DesignObject["align"] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
            </Select>
          </Field>
        </>
      )}

      {(object.type === "rect" || object.type === "ellipse") && (
        <>
          <Field label="Fill color"><Input type="color" value={toHex(object.fill, "#f3e8dc")} onChange={(e) => onChange({ fill: e.target.value })} className="h-9 p-1" /></Field>
          {object.type === "rect" && <Field label="Corner radius"><Input type="number" value={object.rx ?? 0} onChange={(e) => onChange({ rx: Number(e.target.value) })} /></Field>}
        </>
      )}

      {object.type === "image" && (
        <Field label="Image">
          <ImageUpload onUploaded={(url) => onChange({ src: url })} label={object.src ? "Replace image" : "Upload image"} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Width"><Input type="number" value={Math.round(object.width)} onChange={(e) => onChange({ width: Number(e.target.value) })} /></Field>
        <Field label="Height"><Input type="number" value={Math.round(object.height)} onChange={(e) => onChange({ height: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Rotation"><Input type="number" value={Math.round(object.rotation)} onChange={(e) => onChange({ rotation: Number(e.target.value) })} /></Field>

      <div className="space-y-1.5">
        <Label className="text-xs">Layer</Label>
        <div className="grid grid-cols-4 gap-1">
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("front")}><ArrowUpToLine className="size-3.5" /></Button>
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("forward")}><ChevronUp className="size-3.5" /></Button>
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("backward")}><ChevronDown className="size-3.5" /></Button>
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("back")}><ArrowDownToLine className="size-3.5" /></Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onDuplicate}><Copy className="size-3.5" /> Duplicate</Button>
        <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={onDelete}><Trash2 className="size-3.5" /> Delete</Button>
      </div>
    </div>
  )
}

/** <input type="color"> only accepts #rrggbb; older designs may hold a CSS variable, which would render as black. */
function toHex(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
}
