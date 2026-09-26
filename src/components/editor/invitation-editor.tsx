"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Type, Square, Circle, ImageIcon, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  Trash2, Copy, Lock, LockOpen, Eye, EyeOff, ChevronUp, ChevronDown, ArrowUpToLine, ArrowDownToLine,
  Smartphone, Monitor, Save, Tablet, Maximize2, Minimize2, Keyboard, AlignStartVertical, AlignCenterVertical,
  AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlertTriangle, Magnet,
} from "lucide-react"
import { saveDesign } from "@/actions/design"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ImageUpload } from "@/components/shared/image-upload"
import { DesignObjectNode } from "@/components/editor/design-object-node"
import { FontPicker } from "@/components/content/font-picker"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DeviceFrame, PhoneWidthPicker } from "@/components/events/device-preview"
import { useFullscreen } from "@/lib/use-fullscreen"
import { cn } from "@/lib/utils"
import type { DesignObject, CanvasData } from "@/components/editor/types"

import { safe } from "@/lib/safe-action"
const nanoidLike = () => Math.random().toString(36).slice(2, 10)

/** Canvas sizes (must match the list the server accepts). */
const SIZES = [
  { key: "1000x1400", label: "Invitation card", hint: "1000 × 1400", width: 1000, height: 1400 },
  { key: "1080x1920", label: "Phone story", hint: "1080 × 1920 · fills a phone screen", width: 1080, height: 1920 },
  { key: "1080x1080", label: "Square", hint: "1080 × 1080", width: 1080, height: 1080 },
  { key: "1400x1000", label: "Landscape", hint: "1400 × 1000", width: 1400, height: 1000 },
] as const

/** A typical phone shows the design about this many CSS pixels wide (375px screen minus page margins). */
const PHONE_WIDTH = 343
/** Smallest comfortable text size on a phone, in CSS pixels. */
const MIN_PHONE_TEXT = 12

type Box = { x: number; y: number; w: number; h: number }
type Guide = { axis: "x" | "y"; at: number }
type Drag =
  | { kind: "move"; startSvg: { x: number; y: number }; starts: Map<string, { x: number; y: number }> }
  | { kind: "resize"; id: string; hx: number; hy: number; startSvg: { x: number; y: number }; start: DesignObject }
  | { kind: "rotate"; id: string; start: DesignObject }
type Gesture =
  | { kind: "pan"; startClient: { x: number; y: number }; startView: Box }
  | { kind: "pinch"; startDist: number; startMid: { x: number; y: number }; startView: Box }
  | { kind: "marquee"; start: { x: number; y: number }; additive: boolean }

const SHORTCUTS: Array<[string, string]> = [
  ["Click · Shift + click", "Select · add to selection"],
  ["Drag on the empty canvas", "Select everything in a box"],
  ["Space + drag · two fingers", "Move around"],
  ["Ctrl/⌘ + scroll · pinch", "Zoom"],
  ["Double-click text · Enter", "Edit text on the canvas"],
  ["Shift while resizing", "Keep proportions"],
  ["Shift while rotating", "Snap to 15°"],
  ["Alt while moving", "Turn off snapping"],
  ["Arrow keys", "Nudge (Shift = 10×)"],
  ["Ctrl/⌘ + C · X · V", "Copy · cut · paste"],
  ["Ctrl/⌘ + D", "Duplicate"],
  ["Ctrl/⌘ + Z · Shift + Z", "Undo · redo"],
  ["Ctrl/⌘ + ] · [", "Bring forward · send backward"],
  ["Ctrl/⌘ + A", "Select all"],
  ["Delete", "Delete selection"],
  ["+ / − / 0", "Zoom in · out · fit"],
]

function rotate(x: number, y: number, deg: number) {
  const r = (deg * Math.PI) / 180
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) }
}

/** Axis-aligned box around an element, including its rotation. */
function boundsOf(o: DesignObject): Box {
  if (!o.rotation) return { x: o.x, y: o.y, w: o.width, h: o.height }
  const pts = [[0, 0], [o.width, 0], [0, o.height], [o.width, o.height]].map(([px, py]) => { const p = rotate(px, py, o.rotation); return { x: o.x + p.x, y: o.y + p.y } })
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y))
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y }
}

export function InvitationEditor({ eventId, design }: { eventId: string; design: { width: number; height: number; canvasJson: unknown } }) {
  const initial: CanvasData = (design.canvasJson as CanvasData) ?? { objects: [] }
  const [objects, setObjects] = useState<DesignObject[]>(initial.objects ?? [])
  const [size, setSize] = useState({ width: design.width, height: design.height })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [snapping, setSnapping] = useState(true)
  const [viewBox, setViewBox] = useState<Box>({ x: -60, y: -60, w: design.width + 120, h: design.height + 120 })
  const [svgWidth, setSvgWidth] = useState(800)
  // Device preview: the REAL published layout (the same renderer guests get) at real device widths.
  const [phonePreview, setPhonePreview] = useState(false)
  const [phoneWidth, setPhoneWidth] = useState<number>(390)
  const [phoneNonce, setPhoneNonce] = useState(0)
  const [device, setDevice] = useState<"phone" | "tablet" | "desktop">("phone")
  const fullscreen = useFullscreen<HTMLDivElement>()
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  // Bumped when edits arrived while a save was in flight, so the debounced autosave is re-armed for them.
  const [resaveTick, setResaveTick] = useState(0)
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)
  // Latest state for handlers (state is replaced, never mutated).
  const objectsRef = useRef(objects)
  const selectedRef = useRef(selectedIds)
  const viewBoxRef = useRef(viewBox)
  const sizeRef = useRef(size)
  const snappingRef = useRef(snapping)
  const savingRef = useRef(false)
  const moveFrame = useRef<number | null>(null)
  const lastPointer = useRef<{ x: number; y: number; shift: boolean; alt: boolean } | null>(null)
  const historyRef = useRef<DesignObject[][]>([])
  const redoRef = useRef<DesignObject[][]>([])
  const dragRef = useRef<Drag | null>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const clipboard = useRef<DesignObject[]>([])
  const spaceDown = useRef(false)
  const nudgeSnapshot = useRef<number | null>(null)

  useEffect(() => {
    objectsRef.current = objects
    selectedRef.current = selectedIds
    viewBoxRef.current = viewBox
    sizeRef.current = size
    snappingRef.current = snapping
  })

  // Track the canvas's on-screen width so handles and snapping feel the same at every zoom level.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(() => setSvgWidth(svg.clientWidth || 800))
    ro.observe(svg)
    return () => ro.disconnect()
  }, [])
  const unitsPerPx = viewBox.w / Math.max(1, svgWidth)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedObjects = objects.filter((o) => selectedSet.has(o.id))
  const selected = selectedObjects.length === 1 ? selectedObjects[0] : null

  // History keeps references to earlier arrays (objects are replaced, never mutated) — no deep clones of
  // embedded images on every click.
  const snapshot = useCallback(() => {
    historyRef.current.push(objectsRef.current)
    if (historyRef.current.length > 80) historyRef.current.shift()
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
    redoRef.current.push(objectsRef.current)
    commit(prev)
    setSelectedIds((ids) => ids.filter((id) => prev.some((o) => o.id === id)))
  }
  function redo() {
    const next = redoRef.current.pop()
    if (!next) return
    historyRef.current.push(objectsRef.current)
    commit(next)
  }

  /** Save the current design. Returns true when the server confirmed it. */
  const save = useCallback(async (opts?: { silent?: boolean }): Promise<boolean> => {
    if (savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    const snapshotAtSave = objectsRef.current
    const sizeAtSave = sizeRef.current
    const result = await safe(saveDesign(eventId, { objects: snapshotAtSave }, sizeAtSave))
    savingRef.current = false
    setSaving(false)
    if (!result.ok) {
      setSaveFailed(true)
      toast.error(`Save failed: ${result.error}`)
      return false
    }
    // If the user kept editing while the request ran, keep the design marked as changed and schedule another save.
    if (objectsRef.current === snapshotAtSave && sizeRef.current === sizeAtSave) setDirty(false)
    else setResaveTick((t) => t + 1)
    setSaveFailed(false)
    setSavedAt(Date.now())
    if (!opts?.silent) toast.success("Design saved.")
    return true
  }, [eventId])

  // Autosave: local edits stay instant; the database is written once the user pauses.
  useEffect(() => {
    if (!dirty || saveFailed) return
    const timer = setTimeout(() => { void save({ silent: true }) }, 2000)
    return () => clearTimeout(timer)
  }, [objects, size, dirty, saveFailed, save, resaveTick])

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

  async function openPhonePreview() {
    if (dirty && !(await save({ silent: true }))) return
    setPhoneNonce((n) => n + 1)
    setPhonePreview(true)
  }

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  function capture(target: EventTarget | null, pointerId: number) {
    try { (target as Element | null)?.setPointerCapture?.(pointerId) } catch { /* not capturable */ }
  }

  function addObject(type: DesignObject["type"]) {
    snapshot()
    const s = sizeRef.current
    const w = type === "text" ? Math.round(s.width * 0.6) : type === "image" ? Math.round(s.width * 0.4) : 200
    const h = type === "text" ? 90 : type === "image" ? Math.round(s.width * 0.4) : 140
    const base: DesignObject = {
      id: nanoidLike(), type, x: Math.round(s.width / 2 - w / 2), y: Math.round(s.height / 2 - h / 2), width: w, height: h,
      rotation: 0, zIndex: objects.length,
      ...(type === "text" ? { text: "Double-click to edit", fontSize: Math.round(s.width * 0.045), color: "#403447", fontWeight: 700, align: "center" as const } : {}),
      ...(type === "rect" ? { fill: "#f3e8dc", rx: 8 } : {}),
      ...(type === "ellipse" ? { fill: "#f3e8dc" } : {}),
      ...(type === "image" ? { src: "" } : {}),
    }
    commit([...objects, base])
    setSelectedIds([base.id])
    if (type === "text") setEditingTextId(base.id)
  }

  function updateSelected(patch: Partial<DesignObject>) {
    if (!selected) return
    commit(objects.map((o) => (o.id === selected.id ? { ...o, ...patch } : o)))
  }

  const beginMove = useCallback((obj: DesignObject, e: React.PointerEvent) => {
    e.stopPropagation()
    if (e.pointerType === "touch" && pointers.current.size > 0) return
    const current = selectedRef.current
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setSelectedIds(current.includes(obj.id) ? current.filter((id) => id !== obj.id) : [...current, obj.id])
      return
    }
    capture(e.target, e.pointerId)
    const ids = current.includes(obj.id) ? current : [obj.id]
    if (!current.includes(obj.id)) setSelectedIds(ids)
    const movable = objectsRef.current.filter((o) => ids.includes(o.id) && !o.locked)
    if (!movable.length) return
    snapshot()
    dragRef.current = { kind: "move", startSvg: toSvgPoint(e.clientX, e.clientY), starts: new Map(movable.map((o) => [o.id, { x: o.x, y: o.y }])) }
  }, [snapshot]) // eslint-disable-line react-hooks/exhaustive-deps

  const beginResize = useCallback((obj: DesignObject, e: React.PointerEvent, hx: number, hy: number) => {
    e.stopPropagation()
    capture(e.target, e.pointerId)
    snapshot()
    dragRef.current = { kind: "resize", id: obj.id, hx, hy, startSvg: toSvgPoint(e.clientX, e.clientY), start: obj }
  }, [snapshot]) // eslint-disable-line react-hooks/exhaustive-deps

  const beginRotate = useCallback((obj: DesignObject, e: React.PointerEvent) => {
    e.stopPropagation()
    capture(e.target, e.pointerId)
    snapshot()
    dragRef.current = { kind: "rotate", id: obj.id, start: obj }
  }, [snapshot])

  const startTextEdit = useCallback((obj: DesignObject) => {
    if (obj.type !== "text" || obj.locked) return
    setSelectedIds([obj.id])
    setEditingTextId(obj.id)
  }, [])

  const commitText = useCallback((obj: DesignObject, text: string | null) => {
    setEditingTextId(null)
    if (text === null || text === (obj.text ?? "")) return
    snapshot()
    const next = objectsRef.current.map((o) => (o.id === obj.id ? { ...o, text } : o))
    objectsRef.current = next
    setObjects(next)
    setDirty(true)
    setSaveFailed(false)
  }, [snapshot])

  /** Snap a moving box to the page and to other elements; returns the correction and the guide lines to draw. */
  function snapBox(box: Box, ignore: Set<string>): { dx: number; dy: number; guides: Guide[] } {
    const s = sizeRef.current
    const threshold = 6 * (viewBoxRef.current.w / Math.max(1, svgRef.current?.clientWidth ?? 800))
    const xs = [0, s.width / 2, s.width]
    const ys = [0, s.height / 2, s.height]
    for (const o of objectsRef.current) {
      if (ignore.has(o.id) || o.hidden) continue
      const b = boundsOf(o)
      xs.push(b.x, b.x + b.w / 2, b.x + b.w)
      ys.push(b.y, b.y + b.h / 2, b.y + b.h)
    }
    const pick = (edges: number[], lines: number[]) => {
      let best: { d: number; at: number } | null = null
      for (const e of edges) for (const l of lines) {
        const d = l - e
        if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: l }
      }
      return best
    }
    const bx = pick([box.x, box.x + box.w / 2, box.x + box.w], xs)
    const by = pick([box.y, box.y + box.h / 2, box.y + box.h], ys)
    const out: Guide[] = []
    if (bx) out.push({ axis: "x", at: bx.at })
    if (by) out.push({ axis: "y", at: by.at })
    return { dx: bx?.d ?? 0, dy: by?.d ?? 0, guides: out }
  }

  /** Apply the latest pointer position; runs at most once per animation frame. */
  function applyDrag() {
    moveFrame.current = null
    const drag = dragRef.current
    const pointer = lastPointer.current
    if (!drag || !pointer) return
    const p = toSvgPoint(pointer.x, pointer.y)

    if (drag.kind === "move") {
      let dx = p.x - drag.startSvg.x
      let dy = p.y - drag.startSvg.y
      const moving = objectsRef.current.filter((o) => drag.starts.has(o.id))
      let nextGuides: Guide[] = []
      if (snappingRef.current && !pointer.alt && moving.length) {
        const box = unionBox(moving.map((o) => { const s = drag.starts.get(o.id)!; return boundsOf({ ...o, x: s.x + dx, y: s.y + dy }) }))
        if (box) {
          const snap = snapBox(box, new Set(drag.starts.keys()))
          dx += snap.dx
          dy += snap.dy
          nextGuides = snap.guides
        }
      }
      setGuides(nextGuides)
      const next = objectsRef.current.map((o) => { const s = drag.starts.get(o.id); return s ? { ...o, x: s.x + dx, y: s.y + dy } : o })
      objectsRef.current = next
      setObjects(next)
      return
    }

    let patch: Partial<DesignObject>
    if (drag.kind === "resize") {
      const o = drag.start
      const local = rotate(p.x - drag.startSvg.x, p.y - drag.startSvg.y, -o.rotation)
      let w = drag.hx ? o.width + drag.hx * local.x : o.width
      let h = drag.hy ? o.height + drag.hy * local.y : o.height
      const corner = drag.hx !== 0 && drag.hy !== 0
      if (corner && (pointer.shift || o.type === "image")) {
        const f = Math.max(w / o.width, h / o.height)
        w = o.width * f
        h = o.height * f
      }
      w = Math.max(12, w)
      h = Math.max(12, h)
      // Keep the opposite edge/corner where it was, in the element's own (rotated) frame.
      const anchor = (d: number, size: number) => (d === 1 ? 0 : d === -1 ? size : size / 2)
      const shift = rotate(anchor(drag.hx, o.width) - anchor(drag.hx, w), anchor(drag.hy, o.height) - anchor(drag.hy, h), o.rotation)
      patch = { width: Math.round(w), height: Math.round(h), x: o.x + shift.x, y: o.y + shift.y }
      // Resizing a text box from a corner with Shift also scales the text.
      if (o.type === "text" && corner && pointer.shift) patch.fontSize = Math.max(4, Math.round((o.fontSize ?? 24) * (w / o.width)))
    } else {
      const o = drag.start
      const c = rotate(o.width / 2, o.height / 2, o.rotation)
      const cx = o.x + c.x, cy = o.y + c.y
      let angle = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90
      if (pointer.shift) angle = Math.round(angle / 15) * 15
      else for (const snap of [0, 90, 180, 270, 360, -90]) if (Math.abs(angle - snap) < 3) angle = snap
      angle = ((Math.round(angle) % 360) + 360) % 360
      if (angle > 180) angle -= 360
      // Rotate around the centre: move the origin so the centre stays put.
      const nc = rotate(o.width / 2, o.height / 2, angle)
      patch = { rotation: angle, x: cx - nc.x, y: cy - nc.y }
    }
    const next = objectsRef.current.map((o) => (o.id === drag.id ? { ...o, ...patch } : o))
    objectsRef.current = next
    setObjects(next)
  }

  function finishDrag() {
    if (!dragRef.current) return
    if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current)
    applyDrag()
    dragRef.current = null
    setGuides([])
    setDirty(true)
    setSaveFailed(false)
  }

  const clampW = (w: number) => Math.max(sizeRef.current.width * 0.1, Math.min(w, sizeRef.current.width * 4))

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const svg = svgRef.current
    setViewBox((v) => {
      const w = clampW(v.w * factor)
      const h = w * (v.h / v.w)
      if (!svg || clientX === undefined || clientY === undefined) {
        const cx = v.x + v.w / 2, cy = v.y + v.h / 2
        return { x: cx - w / 2, y: cy - h / 2, w, h }
      }
      const r = svg.getBoundingClientRect()
      // The SVG keeps its aspect ratio inside its box ("meet"), so map through the actual drawing area.
      const scale = Math.min(r.width / v.w, r.height / v.h)
      const ox = r.left + (r.width - v.w * scale) / 2, oy = r.top + (r.height - v.h * scale) / 2
      const px = v.x + (clientX - ox) / scale, py = v.y + (clientY - oy) / scale
      const fx = (px - v.x) / v.w, fy = (py - v.y) / v.h
      return { x: px - fx * w, y: py - fy * h, w, h }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function zoom(factor: number) { zoomAt(factor) }
  function fit() {
    const s = sizeRef.current
    setViewBox({ x: -60, y: -60, w: s.width + 120, h: s.height + 120 })
  }

  // Ctrl/⌘ + scroll (and trackpad pinch) zooms at the cursor; plain scroll moves around.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.01), e.clientX, e.clientY)
      else {
        const v = viewBoxRef.current
        const k = v.w / Math.max(1, svg.clientWidth)
        setViewBox({ ...v, x: v.x + e.deltaX * k, y: v.y + e.deltaY * k })
      }
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  function isBackground(target: EventTarget | null) {
    return target === svgRef.current || (target instanceof Element && target.hasAttribute("data-page"))
  }

  function handleSvgPointerDown(e: React.PointerEvent) {
    if (!isBackground(e.target)) return
    if (editingTextId) setEditingTextId(null)
    const svg = svgRef.current!
    capture(svg, e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      gestureRef.current = { kind: "pinch", startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1, startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, startView: { ...viewBoxRef.current } }
      setMarquee(null)
      return
    }
    // Touch: one finger moves around. Mouse: drag draws a selection box (Space + drag moves around).
    if (e.pointerType === "touch" || spaceDown.current || e.button === 1) {
      if (e.pointerType === "touch") setSelectedIds([])
      gestureRef.current = { kind: "pan", startClient: { x: e.clientX, y: e.clientY }, startView: { ...viewBoxRef.current } }
      return
    }
    const p = toSvgPoint(e.clientX, e.clientY)
    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    if (!additive) setSelectedIds([])
    gestureRef.current = { kind: "marquee", start: { x: p.x, y: p.y }, additive }
    setMarquee({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  function handleSvgPointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      lastPointer.current = { x: e.clientX, y: e.clientY, shift: e.shiftKey, alt: e.altKey }
      if (moveFrame.current === null) moveFrame.current = requestAnimationFrame(applyDrag)
      return
    }
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gestureRef.current
    const svg = svgRef.current!
    if (!g) return
    if (g.kind === "pan") {
      const r = svg.getBoundingClientRect()
      const scale = Math.min(r.width / g.startView.w, r.height / g.startView.h)
      setViewBox({ ...g.startView, x: g.startView.x - (e.clientX - g.startClient.x) / scale, y: g.startView.y - (e.clientY - g.startClient.y) / scale })
    } else if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const r = svg.getBoundingClientRect()
      const sv = g.startView
      const s0 = Math.min(r.width / sv.w, r.height / sv.h)
      const ox0 = r.left + (r.width - sv.w * s0) / 2, oy0 = r.top + (r.height - sv.h * s0) / 2
      const px = sv.x + (g.startMid.x - ox0) / s0, py = sv.y + (g.startMid.y - oy0) / s0
      const w = clampW(sv.w * (g.startDist / dist)), h = w * (sv.h / sv.w)
      const s1 = Math.min(r.width / w, r.height / h)
      const ox1 = r.left + (r.width - w * s1) / 2, oy1 = r.top + (r.height - h * s1) / 2
      setViewBox({ x: px - (mid.x - ox1) / s1, y: py - (mid.y - oy1) / s1, w, h })
    } else if (g.kind === "marquee") {
      const p = toSvgPoint(e.clientX, e.clientY)
      setMarquee({ x: Math.min(g.start.x, p.x), y: Math.min(g.start.y, p.y), w: Math.abs(p.x - g.start.x), h: Math.abs(p.y - g.start.y) })
    }
  }

  function handleSvgPointerUp(e: React.PointerEvent) {
    if (dragRef.current) { finishDrag(); return }
    pointers.current.delete(e.pointerId)
    const g = gestureRef.current
    if (g?.kind === "marquee") {
      const m = marquee
      if (m && (m.w > 2 || m.h > 2)) {
        const hit = objectsRef.current.filter((o) => {
          if (o.hidden) return false
          const b = boundsOf(o)
          return b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y
        }).map((o) => o.id)
        setSelectedIds((cur) => (g.additive ? [...new Set([...cur, ...hit])] : hit))
      }
      setMarquee(null)
      gestureRef.current = null
      return
    }
    if (pointers.current.size === 0) gestureRef.current = null
    else if (g?.kind === "pinch") {
      const [rest] = [...pointers.current.values()]
      gestureRef.current = { kind: "pan", startClient: { x: rest.x, y: rest.y }, startView: { ...viewBoxRef.current } }
    }
  }

  function duplicateSelected() {
    const sel = objectsRef.current.filter((o) => selectedRef.current.includes(o.id))
    if (!sel.length) return
    snapshot()
    let z = objectsRef.current.length
    const copies = sel.map((o) => ({ ...o, id: nanoidLike(), x: o.x + 20, y: o.y + 20, zIndex: z++, locked: undefined }))
    commit([...objectsRef.current, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }
  function deleteSelected() {
    const ids = new Set(selectedRef.current)
    if (!ids.size) return
    const deletable = objectsRef.current.filter((o) => ids.has(o.id) && !o.locked)
    if (!deletable.length) { toast.message("Locked elements can't be deleted. Unlock them first."); return }
    snapshot()
    const gone = new Set(deletable.map((o) => o.id))
    commit(objectsRef.current.filter((o) => !gone.has(o.id)))
    setSelectedIds([])
  }
  function copySelected(cut = false) {
    const sel = objectsRef.current.filter((o) => selectedRef.current.includes(o.id))
    if (!sel.length) return
    clipboard.current = sel.map((o) => ({ ...o }))
    if (cut) deleteSelected()
    else toast.message(`${sel.length} element${sel.length === 1 ? "" : "s"} copied.`)
  }
  function paste() {
    if (!clipboard.current.length) return
    snapshot()
    let z = objectsRef.current.length
    const pasted = clipboard.current.map((o) => ({ ...o, id: nanoidLike(), x: o.x + 24, y: o.y + 24, zIndex: z++, locked: undefined }))
    clipboard.current = pasted.map((o) => ({ ...o }))
    commit([...objectsRef.current, ...pasted])
    setSelectedIds(pasted.map((o) => o.id))
  }
  function reorder(dir: "front" | "back" | "forward" | "backward") {
    const ids = new Set(selectedRef.current)
    if (!ids.size) return
    snapshot()
    const sorted = [...objectsRef.current].sort((a, b) => a.zIndex - b.zIndex)
    let next: DesignObject[]
    if (dir === "front") next = [...sorted.filter((o) => !ids.has(o.id)), ...sorted.filter((o) => ids.has(o.id))]
    else if (dir === "back") next = [...sorted.filter((o) => ids.has(o.id)), ...sorted.filter((o) => !ids.has(o.id))]
    else {
      next = [...sorted]
      const order = dir === "forward" ? [...next.keys()].reverse() : [...next.keys()]
      for (const i of order) {
        const j = dir === "forward" ? i + 1 : i - 1
        if (j < 0 || j >= next.length) continue
        if (ids.has(next[i].id) && !ids.has(next[j].id)) [next[i], next[j]] = [next[j], next[i]]
      }
    }
    commit(next.map((o, i) => ({ ...o, zIndex: i })))
  }

  /** Line up the selection: one element against the page, several against each other. */
  function align(edge: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    const sel = objectsRef.current.filter((o) => selectedRef.current.includes(o.id) && !o.locked)
    if (!sel.length) return
    const s = sizeRef.current
    const frame = sel.length === 1 ? { x: 0, y: 0, w: s.width, h: s.height } : unionBox(sel.map(boundsOf))!
    snapshot()
    const next = objectsRef.current.map((o) => {
      if (!sel.some((x) => x.id === o.id)) return o
      const b = boundsOf(o)
      let dx = 0, dy = 0
      if (edge === "left") dx = frame.x - b.x
      if (edge === "hcenter") dx = frame.x + frame.w / 2 - (b.x + b.w / 2)
      if (edge === "right") dx = frame.x + frame.w - (b.x + b.w)
      if (edge === "top") dy = frame.y - b.y
      if (edge === "vcenter") dy = frame.y + frame.h / 2 - (b.y + b.h / 2)
      if (edge === "bottom") dy = frame.y + frame.h - (b.y + b.h)
      return { ...o, x: Math.round(o.x + dx), y: Math.round(o.y + dy) }
    })
    commit(next)
  }

  function distribute(axis: "x" | "y") {
    const sel = objectsRef.current.filter((o) => selectedRef.current.includes(o.id) && !o.locked)
    if (sel.length < 3) return
    const items = sel.map((o) => ({ o, b: boundsOf(o) })).sort((a, b) => (axis === "x" ? a.b.x - b.b.x : a.b.y - b.b.y))
    const first = items[0].b, last = items[items.length - 1].b
    const total = items.reduce((n, i) => n + (axis === "x" ? i.b.w : i.b.h), 0)
    const span = axis === "x" ? last.x + last.w - first.x : last.y + last.h - first.y
    const gap = (span - total) / (items.length - 1)
    let cursor = axis === "x" ? first.x : first.y
    const moves = new Map<string, number>()
    for (const i of items) {
      moves.set(i.o.id, cursor - (axis === "x" ? i.b.x : i.b.y))
      cursor += (axis === "x" ? i.b.w : i.b.h) + gap
    }
    snapshot()
    commit(objectsRef.current.map((o) => { const d = moves.get(o.id); return d === undefined ? o : axis === "x" ? { ...o, x: Math.round(o.x + d) } : { ...o, y: Math.round(o.y + d) } }))
  }

  function nudge(dx: number, dy: number) {
    const ids = new Set(selectedRef.current)
    if (!ids.size) return
    // One undo step per burst of arrow presses.
    if (nudgeSnapshot.current === null) snapshot()
    if (nudgeSnapshot.current) window.clearTimeout(nudgeSnapshot.current)
    nudgeSnapshot.current = window.setTimeout(() => { nudgeSnapshot.current = null }, 600)
    commit(objectsRef.current.map((o) => (ids.has(o.id) && !o.locked ? { ...o, x: o.x + dx, y: o.y + dy } : o)))
  }

  function setLocked(locked: boolean) {
    const ids = new Set(selectedRef.current)
    commit(objectsRef.current.map((o) => (ids.has(o.id) ? { ...o, locked: locked || undefined } : o)))
  }

  // Keyboard shortcuts (ignored while typing in a field or editing text on the canvas).
  const keys = useRef({ undo, redo, duplicateSelected, deleteSelected, copySelected, paste, reorder, nudge, zoom, fit })
  useEffect(() => { keys.current = { undo, redo, duplicateSelected, deleteSelected, copySelected, paste, reorder, nudge, zoom, fit } })
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest('[role="dialog"], [role="menu"], [role="listbox"]'))) return
      if (e.key === " ") { spaceDown.current = true; if (e.target === document.body) e.preventDefault(); return }
      const k = keys.current
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && key === "z") { e.preventDefault(); if (e.shiftKey) k.redo(); else k.undo(); return }
      if (mod && key === "y") { e.preventDefault(); k.redo(); return }
      if (mod && key === "d") { e.preventDefault(); k.duplicateSelected(); return }
      if (mod && key === "c") { k.copySelected(); return }
      if (mod && key === "x") { e.preventDefault(); k.copySelected(true); return }
      if (mod && key === "v") { e.preventDefault(); k.paste(); return }
      if (mod && key === "a") { e.preventDefault(); setSelectedIds(objectsRef.current.filter((o) => !o.hidden).map((o) => o.id)); return }
      if (mod && e.key === "]") { e.preventDefault(); k.reorder(e.shiftKey ? "front" : "forward"); return }
      if (mod && e.key === "[") { e.preventDefault(); k.reorder(e.shiftKey ? "back" : "backward"); return }
      if (mod) return
      if (e.key === "Escape") { setSelectedIds([]); return }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); k.deleteSelected(); return }
      if (e.key === "Enter") {
        const only = selectedRef.current.length === 1 ? objectsRef.current.find((o) => o.id === selectedRef.current[0]) : null
        if (only?.type === "text" && !only.locked) { e.preventDefault(); setEditingTextId(only.id) }
        return
      }
      const step = e.shiftKey ? 10 : 1
      if (e.key === "ArrowLeft") { e.preventDefault(); k.nudge(-step, 0); return }
      if (e.key === "ArrowRight") { e.preventDefault(); k.nudge(step, 0); return }
      if (e.key === "ArrowUp") { e.preventDefault(); k.nudge(0, -step); return }
      if (e.key === "ArrowDown") { e.preventDefault(); k.nudge(0, step); return }
      if (e.key === "+" || e.key === "=") { k.zoom(0.8); return }
      if (e.key === "-" || e.key === "_") { k.zoom(1.25); return }
      if (e.key === "0") { k.fit(); return }
    }
    const onUp = (e: KeyboardEvent) => { if (e.key === " ") spaceDown.current = false }
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp) }
  }, [])

  // Phone readability: how big each text will actually look on a typical phone.
  const phoneScale = PHONE_WIDTH / size.width
  const smallTexts = objects.filter((o) => o.type === "text" && !o.hidden && (o.fontSize ?? 24) * phoneScale < MIN_PHONE_TEXT)
  function fixSmallText() {
    const minSize = Math.ceil(MIN_PHONE_TEXT / phoneScale)
    const ids = new Set(smallTexts.map((o) => o.id))
    snapshot()
    commit(objects.map((o) => {
      if (!ids.has(o.id)) return o
      const ratio = minSize / (o.fontSize ?? 24)
      return { ...o, fontSize: minSize, height: Math.round(o.height * ratio) }
    }))
    toast.success(`${ids.size} text${ids.size === 1 ? "" : "s"} made readable on phones (at least ${MIN_PHONE_TEXT}px).`)
  }

  function changeSize(key: string) {
    const preset = SIZES.find((s) => s.key === key)
    if (!preset) return
    setSize({ width: preset.width, height: preset.height })
    setDirty(true)
    setViewBox({ x: -60, y: -60, w: preset.width + 120, h: preset.height + 120 })
  }

  const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex)
  const multiBox = selectedObjects.length > 1 ? unionBox(selectedObjects.map(boundsOf)) : null
  const status = saving ? "Saving…" : saveFailed ? "Save failed" : dirty ? "Unsaved changes" : savedAt ? "All changes saved" : "Saved"
  const sizeKey = `${size.width}x${size.height}`
  const zoomPercent = Math.round((size.width / viewBox.w) * 100)

  return (
    <div ref={fullscreen.ref} className={cn("flex flex-col lg:h-[calc(100vh-6rem)]", fullscreen.on && `${fullscreen.className} lg:h-dvh`)}>
      <div className="flex flex-wrap items-center gap-1.5 border-b bg-card p-2">
        <Button size="sm" variant="outline" onClick={() => addObject("text")}><Type className="size-3.5" /> Text</Button>
        <Button size="sm" variant="outline" onClick={() => addObject("image")}><ImageIcon className="size-3.5" /> Photo</Button>
        <Button size="sm" variant="outline" onClick={() => addObject("rect")}><Square className="size-3.5" /> Shape</Button>
        <Button size="sm" variant="outline" onClick={() => addObject("ellipse")}><Circle className="size-3.5" /> Circle</Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="icon" variant="ghost" className="size-8" onClick={undo} title="Undo (Ctrl/⌘+Z)"><Undo2 className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={redo} title="Redo (Ctrl/⌘+Shift+Z)"><Redo2 className="size-4" /></Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(0.8)} title="Zoom in (+)"><ZoomIn className="size-4" /></Button>
        <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{zoomPercent}%</span>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(1.25)} title="Zoom out (−)"><ZoomOut className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={fit} title="Fit (0)"><Maximize className="size-4" /></Button>
        <Button size="icon" variant={snapping ? "secondary" : "ghost"} className="size-8" onClick={() => setSnapping((v) => !v)} aria-pressed={snapping} title="Snap to guides"><Magnet className="size-4" /></Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={openPhonePreview} disabled={saving} aria-label="Device preview"><Smartphone className="size-4" /> <span className="hidden md:inline">Device preview</span></Button>
        {smallTexts.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" onClick={fixSmallText} title="Some text will be too small to read on phones">
            <AlertTriangle className="size-3.5" /> {smallTexts.length} small on phones · Fix
          </Button>
        )}
        <div className="flex-1" />
        <span className={cn("hidden sm:inline text-xs", saveFailed ? "text-destructive" : "text-muted-foreground")} aria-live="polite">{status}</span>
        <Popover>
          <PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-8" title="Keyboard shortcuts"><Keyboard className="size-4" /></Button></PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <p className="mb-2 text-sm font-semibold">Shortcuts</p>
            <dl className="space-y-1.5 text-xs">
              {SHORTCUTS.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="font-medium">{k}</dt><dd className="text-right text-muted-foreground">{v}</dd></div>)}
            </dl>
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="outline" onClick={fullscreen.toggle} title={fullscreen.on ? "Exit full screen" : "Full screen"} aria-pressed={fullscreen.on}>
          {fullscreen.on ? <><Minimize2 className="size-3.5" /> Exit</> : <Maximize2 className="size-3.5" />}
        </Button>
        <Button size="sm" variant="outline" onClick={openPreview} disabled={saving}><Eye className="size-3.5" /> Preview</Button>
        <Button size="sm" onClick={() => save()} disabled={saving} variant={saveFailed ? "destructive" : "default"}>
          <Save className="size-3.5" /> {saving ? "Saving..." : saveFailed ? "Retry save" : dirty ? "Save" : "Saved"}
        </Button>
      </div>

      {selectedObjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-b bg-card/60 px-2 py-1">
          <span className="mr-1 text-xs text-muted-foreground">{selectedObjects.length > 1 ? `${selectedObjects.length} selected · align to each other` : "Align to page"}</span>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => align("left")} title="Align left"><AlignStartVertical className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => align("hcenter")} title="Align centre"><AlignCenterVertical className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => align("right")} title="Align right"><AlignEndVertical className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => align("top")} title="Align top"><AlignStartHorizontal className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => align("vcenter")} title="Align middle"><AlignCenterHorizontal className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => align("bottom")} title="Align bottom"><AlignEndHorizontal className="size-4" /></Button>
          {selectedObjects.length > 2 && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => distribute("x")}>Space evenly ↔</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => distribute("y")}>Space evenly ↕</Button>
            </>
          )}
          <div className="h-4 w-px bg-border mx-1" />
          <Button size="icon" variant="ghost" className="size-7" onClick={duplicateSelected} title="Duplicate (Ctrl/⌘+D)"><Copy className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => setLocked(!selectedObjects.every((o) => o.locked))} title="Lock / unlock">{selectedObjects.every((o) => o.locked) ? <Lock className="size-4" /> : <LockOpen className="size-4" />}</Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={deleteSelected} title="Delete"><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      )}

      {/* Canvas above the properties panel on phones; side by side from lg up. */}
      <div className={cn("flex-1 flex flex-col lg:flex-row lg:min-h-0", fullscreen.on && "min-h-0")}>
        <div className={cn("h-[58vh] lg:h-auto flex-1 bg-secondary/30 overflow-hidden flex items-center justify-center", fullscreen.on && "h-auto min-h-0")}>
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="h-full w-full touch-none select-none"
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onPointerCancel={handleSvgPointerUp}
          >
            <rect data-page x={0} y={0} width={size.width} height={size.height} fill="#ffffff" stroke="#00000018" strokeWidth={unitsPerPx} />
            {sortedObjects.map((obj) => (
              <DesignObjectNode
                key={obj.id}
                object={obj}
                selected={selectedSet.has(obj.id)}
                showHandles={selectedIds.length === 1 && selectedSet.has(obj.id) && !obj.locked}
                handleScale={unitsPerPx}
                editing={editingTextId === obj.id}
                onPointerDown={beginMove}
                onResizeStart={beginResize}
                onRotateStart={beginRotate}
                onDoubleClick={startTextEdit}
                onTextCommit={commitText}
              />
            ))}
            {multiBox && (
              <rect x={multiBox.x} y={multiBox.y} width={multiBox.w} height={multiBox.h} fill="none" stroke="var(--brand-purple-deep)" strokeWidth={1.5 * unitsPerPx} strokeDasharray={`${6 * unitsPerPx} ${4 * unitsPerPx}`} pointerEvents="none" />
            )}
            {guides.map((g, i) => g.axis === "x"
              ? <line key={i} x1={g.at} x2={g.at} y1={viewBox.y} y2={viewBox.y + viewBox.h} stroke="#e0457b" strokeWidth={unitsPerPx} pointerEvents="none" />
              : <line key={i} y1={g.at} y2={g.at} x1={viewBox.x} x2={viewBox.x + viewBox.w} stroke="#e0457b" strokeWidth={unitsPerPx} pointerEvents="none" />)}
            {marquee && (
              <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgb(111 90 134 / 0.08)" stroke="var(--brand-purple-deep)" strokeWidth={unitsPerPx} strokeDasharray={`${5 * unitsPerPx} ${4 * unitsPerPx}`} pointerEvents="none" />
            )}
          </svg>
        </div>

        <div className={cn("w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l bg-card overflow-y-auto max-h-[50vh] lg:max-h-none", fullscreen.on && "max-h-[40vh]")}>
          {selected ? (
            <ObjectPanel
              key={selected.id}
              object={selected}
              phoneScale={phoneScale}
              onChange={updateSelected}
              onEditText={() => startTextEdit(selected)}
              onDuplicate={duplicateSelected}
              onDelete={deleteSelected}
              onReorder={reorder}
            />
          ) : selectedObjects.length > 1 ? (
            <div className="p-4 space-y-2 text-sm">
              <p className="font-medium">{selectedObjects.length} elements selected</p>
              <p className="text-muted-foreground">Drag any of them to move them together, or use the align buttons above.</p>
            </div>
          ) : (
            <div className="p-4 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Canvas size</Label>
                <Select value={SIZES.some((s) => s.key === sizeKey) ? sizeKey : "custom"} onValueChange={changeSize}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label} · {s.hint}</SelectItem>)}
                    {!SIZES.some((s) => s.key === sizeKey) && <SelectItem value="custom">Custom · {size.width} × {size.height}</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">On a phone this design shows about {PHONE_WIDTH}px wide, so text looks {Math.round(phoneScale * 100)}% of its size here.</p>
              </div>
              <div className={cn("rounded-lg border p-3 text-xs space-y-2", smallTexts.length ? "border-amber-300 bg-amber-50 text-amber-950" : "bg-emerald-50 border-emerald-200 text-emerald-900")}>
                <p className="font-semibold">{smallTexts.length ? `${smallTexts.length} text${smallTexts.length === 1 ? " is" : "s are"} too small for phones` : "All text is readable on phones"}</p>
                <p>{smallTexts.length ? `Text under ${Math.ceil(MIN_PHONE_TEXT / phoneScale)}px here looks smaller than ${MIN_PHONE_TEXT}px on a phone.` : `Every text is at least ${MIN_PHONE_TEXT}px on a phone screen.`}</p>
                {smallTexts.length > 0 && <Button size="sm" variant="outline" className="bg-white" onClick={fixSmallText}>Make them readable</Button>}
              </div>
              <div className="space-y-2">
                <p className="font-medium text-sm">Layers</p>
                {sortedObjects.length === 0 && <p className="text-xs text-muted-foreground">Add text, photos or shapes to get started.</p>}
                <div className="space-y-1">
                  {[...sortedObjects].reverse().map((o) => (
                    <div key={o.id} className="flex items-center gap-1 rounded-md hover:bg-secondary">
                      <button type="button" onClick={() => setSelectedIds([o.id])} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-xs">
                        {o.type === "text" ? <Type className="size-3.5 shrink-0" /> : o.type === "image" ? <ImageIcon className="size-3.5 shrink-0" /> : <Square className="size-3.5 shrink-0" />}
                        <span className={cn("truncate", o.hidden && "opacity-50")}>{o.type === "text" ? o.text || "Text" : o.type === "image" ? "Photo" : o.type === "ellipse" ? "Circle" : "Shape"}</span>
                      </button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => commit(objects.map((x) => (x.id === o.id ? { ...x, hidden: !x.hidden || undefined } : x)))} aria-label={o.hidden ? "Show" : "Hide"}>{o.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => commit(objects.map((x) => (x.id === o.id ? { ...x, locked: !x.locked || undefined } : x)))} aria-label={o.locked ? "Unlock" : "Lock"}>{o.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5 opacity-40" />}</Button>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Tip: drag on the empty canvas to select several elements. Press the keyboard icon for shortcuts.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={phonePreview} onOpenChange={setPhonePreview}>
        <DialogContent className={cn("max-h-[96dvh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:p-6", device === "phone" ? "sm:max-w-[520px]" : device === "tablet" ? "sm:max-w-[860px]" : "sm:max-w-[min(96vw,1240px)]")}>
          <DialogHeader>
            <DialogTitle>Preview on devices</DialogTitle>
            <DialogDescription>Your saved invitation exactly as guests see it. Scroll inside the screen to see every section.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border p-0.5" role="group" aria-label="Device">
              {([["phone", Smartphone, "Phone"], ["tablet", Tablet, "Tablet"], ["desktop", Monitor, "Desktop"]] as const).map(([key, Icon, label]) => (
                <Button key={key} size="sm" variant={device === key ? "secondary" : "ghost"} className="h-8" onClick={() => setDevice(key)} aria-pressed={device === key}><Icon className="size-4" /> {label}</Button>
              ))}
            </div>
            {device === "phone" && <PhoneWidthPicker value={phoneWidth} onChange={setPhoneWidth} />}
          </div>
          <DeviceFrame
            key={`${device}-${phoneWidth}-${phoneNonce}`}
            src={`/preview/${eventId}?r=${phoneNonce}`}
            width={device === "phone" ? phoneWidth : device === "tablet" ? 768 : null}
            kind={device}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ObjectPanel({
  object, phoneScale, onChange, onEditText, onDuplicate, onDelete, onReorder,
}: { object: DesignObject; phoneScale: number; onChange: (patch: Partial<DesignObject>) => void; onEditText: () => void; onDuplicate: () => void; onDelete: () => void; onReorder: (dir: "front" | "back" | "forward" | "backward") => void }) {
  const phonePx = Math.round((object.fontSize ?? 24) * phoneScale)
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{object.type === "text" ? "Text" : object.type === "image" ? "Photo" : object.type === "ellipse" ? "Circle" : "Shape"}</p>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onChange({ locked: !object.locked || undefined })} aria-label={object.locked ? "Unlock" : "Lock"}>{object.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}</Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onChange({ hidden: !object.hidden || undefined })} aria-label={object.hidden ? "Show" : "Hide"}>{object.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
        </div>
      </div>

      {object.type === "text" && (
        <>
          <Field label="Text"><Textarea rows={3} value={object.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} /></Field>
          <Button size="sm" variant="outline" className="w-full" onClick={onEditText} disabled={object.locked}>Edit on the canvas</Button>
          <Field label="Font">
            <FontPicker label="Font" value={object.fontKey ?? "playfair-display"} previewText={(object.text || "").slice(0, 24) || undefined} onChange={(fontKey) => onChange({ fontKey })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Size"><Input type="number" min={4} max={400} value={object.fontSize ?? 24} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} /></Field>
            <Field label="Weight">
              <Select value={String(object.fontWeight ?? 600)} onValueChange={(v) => onChange({ fontWeight: Number(v) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{[300, 400, 500, 600, 700, 800, 900].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <p className={cn("text-xs", phonePx < MIN_PHONE_TEXT ? "text-amber-700" : "text-muted-foreground")}>
            Looks about {phonePx}px on a phone{phonePx < MIN_PHONE_TEXT ? ` — use at least ${Math.ceil(MIN_PHONE_TEXT / phoneScale)} for easy reading.` : "."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Letter spacing"><Input type="number" step={0.01} min={-0.1} max={1} value={object.letterSpacing ?? 0} onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })} /></Field>
            <Field label="Line height"><Input type="number" step={0.05} min={0.8} max={3} value={object.lineHeight ?? 1.2} onChange={(e) => onChange({ lineHeight: Number(e.target.value) })} /></Field>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="sm" variant={object.italic ? "secondary" : "outline"} aria-pressed={!!object.italic} onClick={() => onChange({ italic: !object.italic })}><span className="italic">I</span> Italic</Button>
            <Button type="button" size="sm" variant={object.textTransform === "uppercase" ? "secondary" : "outline"} aria-pressed={object.textTransform === "uppercase"} onClick={() => onChange({ textTransform: object.textTransform === "uppercase" ? "none" : "uppercase" })}>AA</Button>
            <Button type="button" size="sm" variant={object.textTransform === "lowercase" ? "secondary" : "outline"} aria-pressed={object.textTransform === "lowercase"} onClick={() => onChange({ textTransform: object.textTransform === "lowercase" ? "none" : "lowercase" })}>aa</Button>
            <Button type="button" size="sm" variant={object.textShadow ? "secondary" : "outline"} aria-pressed={!!object.textShadow} onClick={() => onChange({ textShadow: !object.textShadow })}>Shadow</Button>
          </div>
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="Border color"><Input type="color" value={toHex(object.stroke, "#6f5a86")} onChange={(e) => onChange({ stroke: e.target.value, strokeWidth: object.strokeWidth || 2 })} className="h-9 p-1" /></Field>
            <Field label="Border width"><Input type="number" min={0} max={50} value={object.strokeWidth ?? 0} onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })} /></Field>
          </div>
          {object.type === "rect" && <Field label="Corner radius"><Input type="number" min={0} value={object.rx ?? 0} onChange={(e) => onChange({ rx: Number(e.target.value) })} /></Field>}
        </>
      )}

      {object.type === "image" && (
        <>
          <Field label="Photo">
            <ImageUpload onUploaded={(url) => onChange({ src: url })} label={object.src ? "Replace photo" : "Upload photo"} />
          </Field>
          <Field label="Rounded corners"><Input type="number" min={0} value={object.rx ?? 0} onChange={(e) => onChange({ rx: Number(e.target.value) || undefined })} /></Field>
          <p className="text-xs text-muted-foreground">Corner handles keep the photo&apos;s proportions.</p>
        </>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-xs"><Label className="text-xs">Opacity</Label><span className="tabular-nums text-muted-foreground">{Math.round((object.opacity ?? 1) * 100)}%</span></div>
        <input type="range" min={5} max={100} value={Math.round((object.opacity ?? 1) * 100)} onChange={(e) => { const v = Number(e.target.value) / 100; onChange({ opacity: v >= 1 ? undefined : v }) }} className="w-full accent-[var(--primary)]" aria-label="Opacity" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Width"><Input type="number" value={Math.round(object.width)} onChange={(e) => onChange({ width: Math.max(1, Number(e.target.value)) })} /></Field>
        <Field label="Height"><Input type="number" value={Math.round(object.height)} onChange={(e) => onChange({ height: Math.max(1, Number(e.target.value)) })} /></Field>
        <Field label="Rotate°"><Input type="number" value={Math.round(object.rotation)} onChange={(e) => onChange({ rotation: Number(e.target.value) })} /></Field>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Layer</Label>
        <div className="grid grid-cols-4 gap-1">
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("front")} title="Bring to front"><ArrowUpToLine className="size-3.5" /></Button>
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("forward")} title="Bring forward"><ChevronUp className="size-3.5" /></Button>
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("backward")} title="Send backward"><ChevronDown className="size-3.5" /></Button>
          <Button size="icon" variant="outline" className="size-8" onClick={() => onReorder("back")} title="Send to back"><ArrowDownToLine className="size-3.5" /></Button>
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
