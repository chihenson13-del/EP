"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  ZoomIn, ZoomOut, Maximize, Grid3x3, Undo2, Redo2, Trash2, Copy, Lock, LockOpen, Plus, SquareDashed, Keyboard, Maximize2, Minimize2,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useFullscreen } from "@/lib/use-fullscreen"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SHAPE_LABELS, CHAIR_STYLE_LABELS, FLOOR_OBJECT_LABELS, FLOOR_OBJECT_DEFAULT_SIZE } from "@/lib/seating"
import { createTable, updateTableSettings, deleteTable, duplicateTable, updateChair, assignGuestToChair, createFloorObject, updateFloorObject, deleteFloorObject } from "@/actions/seating"
import { bulkSyncLayout } from "@/actions/seating-sync"
import { TableNode } from "./table-node"
import { ObjectNode } from "./object-node"
import type { TableData, FloorObjectData, GuestOption, Selection } from "./types"
import type { TableShape, FloorObjectType, ChairStyle, SeatStatus } from "@prisma/client"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type FloorPlanData = { width: number; height: number; gridSize: number; snapToGrid: boolean; backgroundColor: string }
type SeatingPreset = { key: string; label: string }

const TABLE_GROUPS: Record<string, TableShape[]> = {
  Round: ["ROUND_SMALL", "ROUND_MEDIUM", "ROUND_LARGE"],
  Rectangle: ["RECT_SMALL", "RECT_MEDIUM", "RECT_LARGE", "RECT_LONG"],
  Square: ["SQUARE_SMALL", "SQUARE_LARGE"],
  Oval: ["OVAL_SMALL", "OVAL_LARGE"],
  Banquet: ["BANQUET_LONG", "BANQUET_XLONG"],
  Special: ["HALF_CIRCLE", "CRESCENT", "U_SHAPE", "T_SHAPE", "L_SHAPE"],
  Custom: ["CUSTOM"],
}

function rotatePoint(dx: number, dy: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180
  return { x: dx * Math.cos(rad) - dy * Math.sin(rad), y: dx * Math.sin(rad) + dy * Math.cos(rad) }
}

type Drag =
  | { kind: "table" | "object" | "chair"; id: string; tableId?: string; startSvg: { x: number; y: number }; startPos: { x: number; y: number }; tableRotation?: number }
  | { kind: "group"; startSvg: { x: number; y: number }; tables: Map<string, { x: number; y: number }>; objects: Map<string, { x: number; y: number }> }

type Gesture =
  | { kind: "pan"; startClient: { x: number; y: number }; startView: { x: number; y: number; w: number; h: number } }
  | { kind: "pinch"; startDist: number; startMid: { x: number; y: number }; startView: { x: number; y: number; w: number; h: number } }
  | { kind: "marquee"; start: { x: number; y: number } }

/** Pointer capture keeps a drag going when the finger leaves the item; harmless if the browser refuses it. */
function capture(target: EventTarget | null, pointerId: number) {
  try { (target as Element | null)?.setPointerCapture?.(pointerId) } catch { /* not capturable */ }
}

const tKey = (id: string) => `t:${id}`
const oKey = (id: string) => `o:${id}`

const SHORTCUTS: Array<[string, string]> = [
  ["Click / tap", "Select a table, seat or object"],
  ["Shift + click", "Add to / remove from the selection"],
  ["Shift + drag background", "Select everything in a box"],
  ["Drag background", "Move around the floor plan"],
  ["Pinch · Ctrl + scroll", "Zoom"],
  ["Arrow keys", "Nudge selection (Shift = 10×)"],
  ["Delete / Backspace", "Delete selection"],
  ["Ctrl/⌘ + Z · Shift + Z", "Undo · Redo"],
  ["Ctrl/⌘ + D", "Duplicate table"],
  ["Ctrl/⌘ + A", "Select all tables and objects"],
  ["+ / − / 0", "Zoom in / out / fit"],
  ["Esc", "Clear selection"],
]

export function SeatingEditor({
  eventId, floorPlan, initialTables, initialObjects, guests, seatingPresets,
}: {
  eventId: string
  floorPlan: FloorPlanData
  initialTables: TableData[]
  initialObjects: FloorObjectData[]
  guests: GuestOption[]
  seatingPresets: SeatingPreset[]
}) {
  const [tables, setTables] = useState(initialTables)
  const [objects, setObjects] = useState(initialObjects)
  const [selection, setSelection] = useState<Selection>(null)
  /** Every selected table/object ("t:id" / "o:id"). One item = normal selection; several = move/lock/delete together. */
  const [group, setGroup] = useState<Set<string>>(new Set())
  const [selectTool, setSelectTool] = useState(false)
  const [marquee, setMarquee] = useState<null | { x0: number; y0: number; x1: number; y1: number }>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: floorPlan.width, h: floorPlan.height })
  const [showGrid, setShowGrid] = useState(true)
  const [guestSearch, setGuestSearch] = useState("")
  const fullscreen = useFullscreen<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const historyRef = useRef<{ tables: TableData[]; objects: FloorObjectData[] }[]>([])
  const redoRef = useRef<{ tables: TableData[]; objects: FloorObjectData[] }[]>([])
  const dragRef = useRef<Drag | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)

  // Latest state for handlers that must stay referentially stable (so memoised nodes don't re-render
  // on every mouse move). State is only ever replaced, never mutated, so history can hold references.
  const tablesRef = useRef(tables)
  const objectsRef = useRef(objects)
  const groupRef = useRef(group)
  const selectToolRef = useRef(selectTool)
  const viewBoxRef = useRef(viewBox)
  useEffect(() => {
    tablesRef.current = tables
    objectsRef.current = objects
    groupRef.current = group
    selectToolRef.current = selectTool
    viewBoxRef.current = viewBox
  })
  const moveFrame = useRef<number | null>(null)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const nudgeTimer = useRef<number | null>(null)

  const snapshot = useCallback(() => {
    historyRef.current.push({ tables: tablesRef.current, objects: objectsRef.current })
    if (historyRef.current.length > 50) historyRef.current.shift()
    redoRef.current = []
  }, [])

  /** Persist positions. Undo/redo passes the whole layout; a drag passes only the items that moved. */
  const once = useSingleFlight()
  const syncLayout = useCallback(async (layout: { tables: TableData[]; objects: FloorObjectData[] }) => {
    if (!layout.tables.length && !layout.objects.length) return
    const result = await safe(bulkSyncLayout(eventId, {
      tables: layout.tables.map((t) => ({ id: t.id, x: t.x, y: t.y, rotation: t.rotation })),
      objects: layout.objects.map((o) => ({ id: o.id, x: o.x, y: o.y, rotation: o.rotation, width: o.width, height: o.height })),
    }))
    if (!result.ok) toast.error(`Your layout change couldn't be saved: ${result.error}`)
  }, [eventId])

  function undo() {
    const prev = historyRef.current.pop()
    if (!prev) return
    redoRef.current.push({ tables, objects })
    setTables(prev.tables)
    setObjects(prev.objects)
    syncLayout(prev)
  }

  function redo() {
    const next = redoRef.current.pop()
    if (!next) return
    historyRef.current.push({ tables, objects })
    setTables(next.tables)
    setObjects(next.objects)
    syncLayout(next)
  }

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  /** Keep the single-item selection (settings panel) in step with the group. */
  const applyGroup = useCallback((next: Set<string>) => {
    setGroup(next)
    if (next.size === 1) {
      const [key] = [...next]
      setSelection(key.startsWith("t:") ? { kind: "table", id: key.slice(2) } : { kind: "object", id: key.slice(2) })
    } else {
      setSelection(null)
    }
  }, [])

  const toggleInGroup = useCallback((key: string) => {
    const next = new Set(groupRef.current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    applyGroup(next)
  }, [applyGroup])

  /** Start moving every unlocked item in the selection together. */
  const startGroupDrag = useCallback((e: React.PointerEvent) => {
    snapshot()
    const p = toSvgPoint(e.clientX, e.clientY)
    const tablesStart = new Map<string, { x: number; y: number }>()
    const objectsStart = new Map<string, { x: number; y: number }>()
    for (const key of groupRef.current) {
      if (key.startsWith("t:")) {
        const t = tablesRef.current.find((x) => x.id === key.slice(2))
        if (t && !t.locked) tablesStart.set(t.id, { x: t.x, y: t.y })
      } else {
        const o = objectsRef.current.find((x) => x.id === key.slice(2))
        if (o && !o.locked) objectsStart.set(o.id, { x: o.x, y: o.y })
      }
    }
    dragRef.current = { kind: "group", startSvg: { x: p.x, y: p.y }, tables: tablesStart, objects: objectsStart }
  }, [snapshot])

  const onPointerDownTable = useCallback((table: TableData, e: React.PointerEvent) => {
    capture(e.target, e.pointerId)
    const key = tKey(table.id)
    if (e.shiftKey || e.metaKey || e.ctrlKey || selectToolRef.current) { toggleInGroup(key); return }
    if (groupRef.current.size > 1 && groupRef.current.has(key)) { startGroupDrag(e); return }
    applyGroup(new Set([key]))
    if (table.locked) return
    snapshot()
    const p = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { kind: "table", id: table.id, startSvg: { x: p.x, y: p.y }, startPos: { x: table.x, y: table.y } }
  }, [snapshot, toggleInGroup, startGroupDrag, applyGroup])

  const onPointerDownObject = useCallback((obj: FloorObjectData, e: React.PointerEvent) => {
    capture(e.target, e.pointerId)
    const key = oKey(obj.id)
    if (e.shiftKey || e.metaKey || e.ctrlKey || selectToolRef.current) { toggleInGroup(key); return }
    if (groupRef.current.size > 1 && groupRef.current.has(key)) { startGroupDrag(e); return }
    applyGroup(new Set([key]))
    if (obj.locked) return
    snapshot()
    const p = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { kind: "object", id: obj.id, startSvg: { x: p.x, y: p.y }, startPos: { x: obj.x, y: obj.y } }
  }, [snapshot, toggleInGroup, startGroupDrag, applyGroup])

  const onPointerDownChair = useCallback((table: TableData, chairId: string, e: React.PointerEvent) => {
    capture(e.target, e.pointerId)
    const chair = table.chairs.find((c) => c.id === chairId)
    if (!chair) return
    setGroup(new Set())
    snapshot()
    const p = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { kind: "chair", id: chairId, tableId: table.id, startSvg: { x: p.x, y: p.y }, startPos: { x: chair.x, y: chair.y }, tableRotation: table.rotation }
    setSelection({ kind: "chair", id: chairId, tableId: table.id })
  }, [snapshot])

  /** Apply the latest pointer position to the dragged item(s). Runs at most once per animation frame. */
  function applyDrag() {
    moveFrame.current = null
    const drag = dragRef.current
    const pointer = lastPointer.current
    if (!drag || !pointer) return
    const p = toSvgPoint(pointer.x, pointer.y)
    const dx = p.x - drag.startSvg.x
    const dy = p.y - drag.startSvg.y

    if (drag.kind === "group") {
      if (drag.tables.size) {
        const next = tablesRef.current.map((t) => { const s = drag.tables.get(t.id); return s ? { ...t, x: s.x + dx, y: s.y + dy } : t })
        tablesRef.current = next
        setTables(next)
      }
      if (drag.objects.size) {
        const next = objectsRef.current.map((o) => { const s = drag.objects.get(o.id); return s ? { ...o, x: s.x + dx, y: s.y + dy } : o })
        objectsRef.current = next
        setObjects(next)
      }
    } else if (drag.kind === "table") {
      const next = tablesRef.current.map((t) => (t.id === drag.id ? { ...t, x: drag.startPos.x + dx, y: drag.startPos.y + dy } : t))
      tablesRef.current = next
      setTables(next)
    } else if (drag.kind === "object") {
      const next = objectsRef.current.map((o) => (o.id === drag.id ? { ...o, x: drag.startPos.x + dx, y: drag.startPos.y + dy } : o))
      objectsRef.current = next
      setObjects(next)
    } else if (drag.kind === "chair") {
      const local = rotatePoint(dx, dy, -(drag.tableRotation ?? 0))
      const next = tablesRef.current.map((t) => t.id !== drag.tableId ? t : {
        ...t,
        chairs: t.chairs.map((c) => c.id === drag.id ? { ...c, x: drag.startPos.x + local.x, y: drag.startPos.y + local.y } : c),
      })
      tablesRef.current = next
      setTables(next)
    }
  }

  async function finishDrag() {
    const drag = dragRef.current
    if (!drag) return
    if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current)
    applyDrag()
    dragRef.current = null

    // Save only what moved, not the whole floor plan.
    if (drag.kind === "group") {
      await syncLayout({ tables: tablesRef.current.filter((t) => drag.tables.has(t.id)), objects: objectsRef.current.filter((o) => drag.objects.has(o.id)) })
    } else if (drag.kind === "table") {
      await syncLayout({ tables: tablesRef.current.filter((t) => t.id === drag.id), objects: [] })
    } else if (drag.kind === "object") {
      await syncLayout({ tables: [], objects: objectsRef.current.filter((o) => o.id === drag.id) })
    } else {
      const chair = tablesRef.current.find((t) => t.id === drag.tableId)?.chairs.find((c) => c.id === drag.id)
      if (chair) {
        const result = await safe(updateChair(eventId, chair.id, { x: chair.x, y: chair.y }))
        if (!result.ok) toast.error(`The seat position couldn't be saved: ${result.error}`)
      }
    }
  }

  const clampWidth = (w: number) => Math.min(Math.max(w, floorPlan.width * 0.2), floorPlan.width * 4)

  /** Zoom keeping the point under (clientX, clientY) still — pinch, Ctrl+scroll and the buttons all use this. */
  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const svg = svgRef.current
    setViewBox((v) => {
      const w = clampWidth(v.w * factor)
      const h = w * (v.h / v.w)
      if (!svg || clientX === undefined || clientY === undefined) {
        const cx = v.x + v.w / 2
        const cy = v.y + v.h / 2
        return { x: cx - w / 2, y: cy - h / 2, w, h }
      }
      const r = svg.getBoundingClientRect()
      const fx = (clientX - r.left) / r.width
      const fy = (clientY - r.top) / r.height
      const px = v.x + fx * v.w
      const py = v.y + fy * v.h
      return { x: px - fx * w, y: py - fy * h, w, h }
    })
  }, [floorPlan.width]) // eslint-disable-line react-hooks/exhaustive-deps

  function zoom(factor: number) { zoomAt(factor) }
  function fitToScreen() { setViewBox({ x: 0, y: 0, w: floorPlan.width, h: floorPlan.height }) }

  // Ctrl/⌘ + scroll (and trackpad pinch) zooms at the cursor; plain scroll moves around the floor plan.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        zoomAt(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.01), e.clientX, e.clientY)
      } else {
        const v = viewBoxRef.current
        const scale = v.w / svg.clientWidth
        setViewBox({ ...v, x: v.x + e.deltaX * scale, y: v.y + e.deltaY * scale })
      }
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  function isBackground(target: EventTarget | null) {
    return target === svgRef.current || (target instanceof Element && target.hasAttribute("data-floor"))
  }

  function handleSvgPointerDown(e: React.PointerEvent) {
    if (!isBackground(e.target)) return
    const svg = svgRef.current!
    capture(svg, e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = { kind: "pinch", startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1, startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, startView: { ...viewBoxRef.current } }
      setMarquee(null)
      return
    }
    if (e.shiftKey || selectToolRef.current) {
      const p = toSvgPoint(e.clientX, e.clientY)
      gesture.current = { kind: "marquee", start: { x: p.x, y: p.y } }
      setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
      return
    }
    applyGroup(new Set())
    gesture.current = { kind: "pan", startClient: { x: e.clientX, y: e.clientY }, startView: { ...viewBoxRef.current } }
  }

  function handleSvgPointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      lastPointer.current = { x: e.clientX, y: e.clientY }
      if (moveFrame.current === null) moveFrame.current = requestAnimationFrame(applyDrag)
      return
    }
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const svg = svgRef.current!
    if (!g) return
    if (g.kind === "pan") {
      const scale = g.startView.w / svg.clientWidth
      setViewBox({ ...g.startView, x: g.startView.x - (e.clientX - g.startClient.x) * scale, y: g.startView.y - (e.clientY - g.startClient.y) * scale })
    } else if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const r = svg.getBoundingClientRect()
      const w = clampWidth(g.startView.w * (g.startDist / dist))
      const h = w * (g.startView.h / g.startView.w)
      const px = g.startView.x + ((g.startMid.x - r.left) / r.width) * g.startView.w
      const py = g.startView.y + ((g.startMid.y - r.top) / r.height) * g.startView.h
      setViewBox({ x: px - ((mid.x - r.left) / r.width) * w, y: py - ((mid.y - r.top) / r.height) * h, w, h })
    } else if (g.kind === "marquee") {
      const p = toSvgPoint(e.clientX, e.clientY)
      setMarquee({ x0: g.start.x, y0: g.start.y, x1: p.x, y1: p.y })
    }
  }

  function handleSvgPointerUp(e: React.PointerEvent) {
    if (dragRef.current) { void finishDrag(); return }
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (g?.kind === "marquee") {
      const m = marquee
      if (m) {
        const [minX, maxX] = [Math.min(m.x0, m.x1), Math.max(m.x0, m.x1)]
        const [minY, maxY] = [Math.min(m.y0, m.y1), Math.max(m.y0, m.y1)]
        const inside = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY
        const next = new Set(e.shiftKey || selectToolRef.current ? groupRef.current : [])
        for (const t of tablesRef.current) if (inside(t.x, t.y)) next.add(tKey(t.id))
        for (const o of objectsRef.current) if (inside(o.x, o.y)) next.add(oKey(o.id))
        applyGroup(next)
      }
      setMarquee(null)
      gesture.current = null
      return
    }
    if (pointers.current.size === 0) gesture.current = null
    else if (g?.kind === "pinch") {
      // One finger lifted: continue as a pan with the remaining finger.
      const [rest] = [...pointers.current.values()]
      gesture.current = { kind: "pan", startClient: { x: rest.x, y: rest.y }, startView: { ...viewBoxRef.current } }
    }
  }

  function handleAddTable(shape: TableShape) {
    return once(async () => {
      const result = await safe(createTable(eventId, shape, viewBox.x + viewBox.w / 2, viewBox.y + viewBox.h / 2))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const table = await fetchFreshTable(result.data.id)
      if (table) setTables((prev) => [...prev, table])
    })
  }

  function handleAddPreset(preset: SeatingPreset) {
    return once(async () => {
      const result = await safe(createTable(eventId, "ROUND_MEDIUM", viewBox.x + viewBox.w / 2, viewBox.y + viewBox.h / 2))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const renamed = await safe(updateTableSettings(eventId, result.data.id, { name: preset.label }))
      if (!renamed.ok) toast.error(renamed.error)
      const table = await fetchFreshTable(result.data.id)
      if (table) setTables((prev) => [...prev, { ...table, name: preset.label }])
    })
  }

  async function fetchFreshTable(id: string): Promise<TableData | null> {
    try {
      const res = await fetch(`/api/events/${eventId}/tables/${id}`)
      if (!res.ok) throw new Error("bad response")
      return (await res.json()) as TableData
    } catch {
      toast.error("The table was saved but couldn't be displayed. Refresh the page to see it.")
      return null
    }
  }

  function handleAddObject(type: FloorObjectType) {
    return once(async () => {
      const size = FLOOR_OBJECT_DEFAULT_SIZE[type]
      const result = await safe(createFloorObject(eventId, type, viewBox.x + viewBox.w / 2, viewBox.y + viewBox.h / 2, size.width, size.height))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setObjects((prev) => [...prev, { id: result.data.id, type, label: FLOOR_OBJECT_LABELS[type], x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2, width: size.width, height: size.height, rotation: 0, color: "#d9d2c7", locked: false }])
    })
  }

  const selectedTable = selection?.kind === "table" ? tables.find((t) => t.id === selection.id) : selection?.kind === "chair" ? tables.find((t) => t.id === selection.tableId) : undefined
  const selectedChair = selection?.kind === "chair" ? selectedTable?.chairs.find((c) => c.id === selection.id) : undefined
  const selectedObject = selection?.kind === "object" ? objects.find((o) => o.id === selection.id) : undefined

  const seatedGuestIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of tables) for (const c of t.chairs) if (c.guestId) ids.add(c.guestId)
    return ids
  }, [tables])

  const filteredGuests = useMemo(
    () => guests.filter((g) => `${g.firstName} ${g.lastName ?? ""}`.toLowerCase().includes(guestSearch.toLowerCase())),
    [guests, guestSearch]
  )

  async function patchSelectedTable(patch: Parameters<typeof updateTableSettings>[2]) {
    if (!selectedTable) return
    snapshot()
    const result = await safe(updateTableSettings(eventId, selectedTable.id, patch))
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    const fresh = await fetchFreshTable(selectedTable.id)
    if (fresh) setTables((prev) => prev.map((t) => (t.id === fresh.id ? fresh : t)))
  }

  async function patchSelectedChair(patch: { style?: ChairStyle; status?: SeatStatus }) {
    if (!selectedChair) return
    const result = await safe(updateChair(eventId, selectedChair.id, patch))
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setTables((prev) => prev.map((t) => ({ ...t, chairs: t.chairs.map((c) => (c.id === selectedChair.id ? { ...c, ...patch } : c)) })))
  }

  async function assignGuest(guestId: string | null) {
    if (!selectedChair) return
    const result = await safe(assignGuestToChair(eventId, selectedChair.id, guestId))
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    const guest = guestId ? guests.find((g) => g.id === guestId) : null
    setTables((prev) => prev.map((t) => ({
      ...t,
      chairs: t.chairs.map((c) => {
        if (c.id === selectedChair.id) return { ...c, guestId, guest: guest ? { id: guest.id, firstName: guest.firstName, lastName: guest.lastName } : null, status: guestId ? "ASSIGNED" : "EMPTY" }
        if (c.guestId === guestId) return { ...c, guestId: null, guest: null, status: "EMPTY" }
        return c
      }),
    })))
    toast.success(guestId ? "Guest assigned." : "Seat cleared.")
  }

  /** The tables/objects the next action applies to: the group, or the single selected item. */
  function targets() {
    const keys = group.size ? [...group] : selection?.kind === "table" ? [tKey(selection.id)] : selection?.kind === "object" ? [oKey(selection.id)] : []
    return { tableIds: keys.filter((k) => k.startsWith("t:")).map((k) => k.slice(2)), objectIds: keys.filter((k) => k.startsWith("o:")).map((k) => k.slice(2)) }
  }

  async function handleDeleteSelection() {
    const { tableIds, objectIds } = targets()
    const count = tableIds.length + objectIds.length
    if (!count) return
    const seated = tables.filter((t) => tableIds.includes(t.id)).reduce((n, t) => n + t.chairs.filter((c) => c.guestId).length, 0)
    if ((count > 1 || seated > 0) && !window.confirm(`Delete ${count} item${count === 1 ? "" : "s"}?${seated ? ` ${seated} seated guest${seated === 1 ? "" : "s"} will be unseated.` : ""}`)) return
    const results = await Promise.all([
      ...tableIds.map((id) => safe(deleteTable(eventId, id)).then((r) => ({ r, id, kind: "t" as const }))),
      ...objectIds.map((id) => safe(deleteFloorObject(eventId, id)).then((r) => ({ r, id, kind: "o" as const }))),
    ])
    const failed = results.filter((x) => !x.r.ok)
    const gone = new Set(results.filter((x) => x.r.ok).map((x) => `${x.kind}:${x.id}`))
    setTables((prev) => prev.filter((t) => !gone.has(tKey(t.id))))
    setObjects((prev) => prev.filter((o) => !gone.has(oKey(o.id))))
    if (failed.length) toast.error(`${failed.length} item${failed.length === 1 ? "" : "s"} couldn't be deleted.`)
    applyGroup(new Set())
    setSelection(null)
  }

  async function setLockedForSelection(locked: boolean) {
    const { tableIds, objectIds } = targets()
    await Promise.all([
      ...tableIds.map((id) => safe(updateTableSettings(eventId, id, { locked }))),
      ...objectIds.map((id) => safe(updateFloorObject(eventId, id, { locked }))),
    ])
    setTables((prev) => prev.map((t) => (tableIds.includes(t.id) ? { ...t, locked } : t)))
    setObjects((prev) => prev.map((o) => (objectIds.includes(o.id) ? { ...o, locked } : o)))
    toast.success(locked ? "Locked." : "Unlocked.")
  }

  /** Arrow keys: move the selection a little; saved shortly after the last key press. */
  function nudge(dx: number, dy: number) {
    const { tableIds, objectIds } = targets()
    if (!tableIds.length && !objectIds.length) return
    snapshot()
    const movedTables = tablesRef.current.map((t) => (tableIds.includes(t.id) && !t.locked ? { ...t, x: t.x + dx, y: t.y + dy } : t))
    const movedObjects = objectsRef.current.map((o) => (objectIds.includes(o.id) && !o.locked ? { ...o, x: o.x + dx, y: o.y + dy } : o))
    tablesRef.current = movedTables
    objectsRef.current = movedObjects
    setTables(movedTables)
    setObjects(movedObjects)
    if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current)
    nudgeTimer.current = window.setTimeout(() => {
      void syncLayout({ tables: tablesRef.current.filter((t) => tableIds.includes(t.id)), objects: objectsRef.current.filter((o) => objectIds.includes(o.id)) })
    }, 400)
  }

  function handleDuplicateTable() {
    return once(async () => {
      if (!selectedTable) return
      const result = await safe(duplicateTable(eventId, selectedTable.id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const fresh = await fetchFreshTable(result.data.id)
      if (fresh) { setTables((prev) => [...prev, fresh]); applyGroup(new Set([tKey(fresh.id)])) }
    })
  }

  // Keyboard shortcuts (ignored while typing in a field).
  const keysRef = useRef({ undo, redo, nudge, handleDeleteSelection, handleDuplicateTable, zoom, fitToScreen })
  useEffect(() => { keysRef.current = { undo, redo, nudge, handleDeleteSelection, handleDuplicateTable, zoom, fitToScreen } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest('[role="dialog"], [role="menu"], [role="listbox"]'))) return
      const k = keysRef.current
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && key === "z") { e.preventDefault(); if (e.shiftKey) k.redo(); else k.undo(); return }
      if (mod && key === "y") { e.preventDefault(); k.redo(); return }
      if (mod && key === "d") { e.preventDefault(); k.handleDuplicateTable(); return }
      if (mod && key === "a") {
        e.preventDefault()
        applyGroup(new Set([...tablesRef.current.map((x) => tKey(x.id)), ...objectsRef.current.map((x) => oKey(x.id))]))
        return
      }
      if (mod) return
      if (e.key === "Escape") { applyGroup(new Set()); setSelection(null); return }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); void k.handleDeleteSelection(); return }
      const step = e.shiftKey ? 10 : 1
      if (e.key === "ArrowLeft") { e.preventDefault(); k.nudge(-step, 0); return }
      if (e.key === "ArrowRight") { e.preventDefault(); k.nudge(step, 0); return }
      if (e.key === "ArrowUp") { e.preventDefault(); k.nudge(0, -step); return }
      if (e.key === "ArrowDown") { e.preventDefault(); k.nudge(0, step); return }
      if (e.key === "+" || e.key === "=") { k.zoom(0.8); return }
      if (e.key === "-" || e.key === "_") { k.zoom(1.25); return }
      if (e.key === "0") { k.fitToScreen(); return }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [applyGroup])

  const onGuestDrop = useCallback(async (tableId: string, chairId: string, guestId: string) => {
    setSelection({ kind: "chair", id: chairId, tableId })
    const result = await safe(assignGuestToChair(eventId, chairId, guestId))
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    const guest = guests.find((g) => g.id === guestId)
    setTables((prev) => prev.map((tb) => ({
      ...tb,
      chairs: tb.chairs.map((c) => {
        if (c.id === chairId) return { ...c, guestId, guest: guest ? { id: guest.id, firstName: guest.firstName, lastName: guest.lastName } : null, status: "ASSIGNED" }
        if (c.guestId === guestId) return { ...c, guestId: null, guest: null, status: "EMPTY" }
        return c
      }),
    })))
    toast.success("Guest seated.")
  }, [eventId, guests])

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0)
  const assignedCount = tables.reduce((sum, t) => sum + t.chairs.filter((c) => c.guestId).length, 0)
  const zoomPercent = Math.round((floorPlan.width / viewBox.w) * 100)
  const multi = group.size > 1
  const hasTarget = group.size > 0 || selection?.kind === "table" || selection?.kind === "object"

  return (
    <div
      ref={fullscreen.ref}
      className={cn("flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-6rem)]", fullscreen.on && `${fullscreen.className} gap-0 lg:h-dvh`)}
    >
      <div className={cn("w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r bg-card p-3 overflow-y-auto space-y-4 max-h-64 lg:max-h-none", fullscreen.on && "hidden lg:block")}>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Guests</p>
          <Input placeholder="Search guests..." value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} className="mb-2" />
          <p className="text-xs text-muted-foreground mb-2">{assignedCount}/{totalCapacity} seated · drag a guest onto a seat</p>
          <div className="space-y-1 max-h-40 lg:max-h-[calc(100vh-20rem)] overflow-y-auto">
            {filteredGuests.map((g) => (
              <div
                key={g.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/guest-id", g.id)}
                className="flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-xs cursor-grab bg-background hover:border-primary/50"
              >
                <span className="truncate">{g.firstName} {g.lastName}</span>
                {seatedGuestIds.has(g.id) ? <Badge variant="outline" className="text-[10px] px-1 py-0">Seated</Badge> : <Badge variant="secondary" className="text-[10px] px-1 py-0">{g.rsvpStatus}</Badge>}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {seatingPresets.map((p) => (
              <Button key={p.key} variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAddPreset(p)}>{p.label}</Button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("flex-1 flex flex-col min-w-0 h-[70dvh] lg:h-auto", fullscreen.on && "h-auto min-h-0")}>
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-card p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm"><Plus className="size-3.5" /> Table</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(TABLE_GROUPS).map(([groupName, shapes]) => (
                <div key={groupName}>
                  <DropdownMenuLabel className="text-xs">{groupName}</DropdownMenuLabel>
                  {shapes.map((s) => <DropdownMenuItem key={s} onClick={() => handleAddTable(s)}>{SHAPE_LABELS[s]}</DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="outline"><Plus className="size-3.5" /> Object</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(FLOOR_OBJECT_LABELS).map(([type, label]) => (
                <DropdownMenuItem key={type} onClick={() => handleAddObject(type as FloorObjectType)}>{label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="h-5 w-px bg-border mx-1" />
          <Button size="icon" variant={selectTool ? "secondary" : "ghost"} className="size-8" onClick={() => setSelectTool((v) => !v)} aria-pressed={selectTool} title="Select several (tap items, or drag a box)"><SquareDashed className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={undo} title="Undo (Ctrl/⌘+Z)"><Undo2 className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={redo} title="Redo (Ctrl/⌘+Shift+Z)"><Redo2 className="size-4" /></Button>
          <div className="h-5 w-px bg-border mx-1" />
          <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(0.8)} title="Zoom in (+)"><ZoomIn className="size-4" /></Button>
          <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">{zoomPercent}%</span>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(1.25)} title="Zoom out (−)"><ZoomOut className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={fitToScreen} title="Fit (0)"><Maximize className="size-4" /></Button>
          <Button size="icon" variant={showGrid ? "secondary" : "ghost"} className="size-8" onClick={() => setShowGrid((v) => !v)} title="Grid"><Grid3x3 className="size-4" /></Button>
          {hasTarget && (
            <>
              <div className="h-5 w-px bg-border mx-1" />
              {selection?.kind === "table" && !multi && <Button size="icon" variant="ghost" className="size-8" onClick={handleDuplicateTable} title="Duplicate (Ctrl/⌘+D)"><Copy className="size-4" /></Button>}
              <Button size="icon" variant="ghost" className="size-8" onClick={handleDeleteSelection} title="Delete"><Trash2 className="size-4 text-destructive" /></Button>
            </>
          )}
          <div className="flex-1" />
          <Popover>
            <PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-8" title="Keyboard shortcuts"><Keyboard className="size-4" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <p className="mb-2 text-sm font-semibold">Shortcuts</p>
              <dl className="space-y-1.5 text-xs">
                {SHORTCUTS.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="font-medium">{k}</dt><dd className="text-right text-muted-foreground">{v}</dd></div>)}
              </dl>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" onClick={fullscreen.toggle} title={fullscreen.on ? "Exit full screen" : "Full screen"}>
            {fullscreen.on ? <><Minimize2 className="size-4" /> Exit</> : <Maximize2 className="size-4" />}
          </Button>
        </div>
        {(multi || selectTool) && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-3 py-1.5 text-xs">
            <span className="font-medium">{group.size} selected</span>
            {selectTool && <span className="text-muted-foreground">Tap items to add or remove them, or drag a box.</span>}
            {group.size > 0 && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setLockedForSelection(true)}><Lock className="size-3.5" /> Lock</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setLockedForSelection(false)}><LockOpen className="size-3.5" /> Unlock</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyGroup(new Set())}>Clear</Button>
              </>
            )}
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="flex-1 min-h-0 w-full bg-secondary/20 touch-none select-none"
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerCancel={handleSvgPointerUp}
        >
          <defs>
            <pattern id="grid" width={floorPlan.gridSize} height={floorPlan.gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${floorPlan.gridSize} 0 L 0 0 0 ${floorPlan.gridSize}`} fill="none" stroke="#00000012" strokeWidth={1} />
            </pattern>
          </defs>
          <rect data-floor x={0} y={0} width={floorPlan.width} height={floorPlan.height} fill={floorPlan.backgroundColor} />
          {showGrid && <rect data-floor x={0} y={0} width={floorPlan.width} height={floorPlan.height} fill="url(#grid)" />}

          {objects.map((o) => (
            <ObjectNode
              key={o.id}
              object={o}
              selected={group.has(oKey(o.id)) || (selection?.kind === "object" && selection.id === o.id)}
              onPointerDown={onPointerDownObject}
            />
          ))}

          {tables.map((t) => (
            <TableNode
              key={t.id}
              table={t}
              selected={group.has(tKey(t.id)) || (selection?.kind === "table" && selection.id === t.id)}
              selectedChairId={selection?.kind === "chair" ? selection.id : null}
              onTablePointerDown={onPointerDownTable}
              onChairPointerDown={onPointerDownChair}
              onGuestDrop={onGuestDrop}
            />
          ))}

          {marquee && (
            <rect
              x={Math.min(marquee.x0, marquee.x1)} y={Math.min(marquee.y0, marquee.y1)}
              width={Math.abs(marquee.x1 - marquee.x0)} height={Math.abs(marquee.y1 - marquee.y0)}
              fill="rgb(111 90 134 / 0.08)" stroke="var(--brand-purple-deep)" strokeDasharray="6 4" strokeWidth={1.5} pointerEvents="none"
            />
          )}
        </svg>
      </div>

      <div className={cn("w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l bg-card p-4 overflow-y-auto", fullscreen.on && "hidden lg:block")}>
        {!selection && !multi && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Nothing selected</p>
            <p>Tap a table, seat or object to edit it. Drag the background to move around; pinch or Ctrl + scroll to zoom. Shift + click (or the select tool) picks several.</p>
          </div>
        )}
        {multi && (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{group.size} items selected</p>
            <p className="text-muted-foreground">Drag any of them to move them together. Arrow keys nudge them.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setLockedForSelection(true)}><Lock className="size-3.5" /> Lock all</Button>
              <Button variant="outline" size="sm" onClick={() => setLockedForSelection(false)}><LockOpen className="size-3.5" /> Unlock all</Button>
              <Button variant="outline" size="sm" className="col-span-2 text-destructive" onClick={handleDeleteSelection}><Trash2 className="size-3.5" /> Delete selected</Button>
            </div>
          </div>
        )}
        {selectedTable && selection?.kind === "table" && (
          <TableSettingsPanel key={selectedTable.id} table={selectedTable} onPatch={patchSelectedTable} />
        )}
        {selectedChair && (
          <SeatSettingsPanel
            chair={selectedChair}
            tableName={selectedTable?.name ?? ""}
            guests={guests}
            onPatch={patchSelectedChair}
            onAssign={assignGuest}
          />
        )}
        {selectedObject && (
          <ObjectSettingsPanel key={selectedObject.id} object={selectedObject} onPatch={async (patch) => {
            await safe(updateFloorObject(eventId, selectedObject.id, patch))
            setObjects((prev) => prev.map((o) => (o.id === selectedObject.id ? { ...o, ...patch } : o)))
          }} />
        )}
      </div>
    </div>
  )
}

function TableSettingsPanel({ table, onPatch }: { table: TableData; onPatch: (patch: Parameters<typeof updateTableSettings>[2]) => void }) {
  const assigned = table.chairs.filter((c) => c.guestId).length
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">Table Settings</p>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => onPatch({ locked: !table.locked })}>
          {table.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input defaultValue={table.name} onBlur={(e) => onPatch({ name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Shape</Label>
        <Select value={table.shape} onValueChange={(v) => onPatch({ shape: v as TableShape })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(SHAPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Capacity</Label>
        <Input type="number" min={1} max={30} defaultValue={table.capacity} onBlur={(e) => onPatch({ capacity: Number(e.target.value) })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Fill color</Label>
          <Input type="color" defaultValue={table.color} onBlur={(e) => onPatch({ color: e.target.value })} className="h-9 p-1" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Border color</Label>
          <Input type="color" defaultValue={table.borderColor} onBlur={(e) => onPatch({ borderColor: e.target.value })} className="h-9 p-1" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Show label</Label>
        <Switch checked={table.labelVisible} onCheckedChange={(c) => onPatch({ labelVisible: c })} />
      </div>
      <div className="rounded-lg bg-secondary/50 p-3 text-sm">
        <p className="font-medium">Table {table.number}</p>
        <p className="text-muted-foreground">Capacity: {table.capacity} · Assigned: {assigned} · Available: {Math.max(0, table.capacity - assigned)}</p>
        {assigned > table.capacity && <p className="text-destructive text-xs mt-1">Over capacity — consider adding seats.</p>}
      </div>
    </div>
  )
}

function SeatSettingsPanel({
  chair, tableName, guests, onPatch, onAssign,
}: { chair: TableData["chairs"][number]; tableName: string; guests: GuestOption[]; onPatch: (patch: { style?: ChairStyle; status?: SeatStatus }) => void; onAssign: (guestId: string | null) => void }) {
  return (
    <div className="space-y-4">
      <p className="font-medium">Seat Settings</p>
      <div className="text-sm text-muted-foreground">{tableName} · Seat #{chair.seatNumber}</div>
      <div className="space-y-1.5">
        <Label className="text-xs">Guest</Label>
        <Select value={chair.guestId ?? "__none__"} onValueChange={(v) => onAssign(v === "__none__" ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {guests.map((g) => <SelectItem key={g.id} value={g.id}>{g.firstName} {g.lastName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Style</Label>
        <Select value={chair.style} onValueChange={(v) => onPatch({ style: v as ChairStyle })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(CHAIR_STYLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Status</Label>
        <Select value={chair.status} onValueChange={(v) => onPatch({ status: v as SeatStatus })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["EMPTY", "ASSIGNED", "CHECKED_IN", "VIP", "RESERVED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ObjectSettingsPanel({ object, onPatch }: { object: FloorObjectData; onPatch: (patch: Partial<FloorObjectData>) => void }) {
  return (
    <div className="space-y-4">
      <p className="font-medium">Object Settings</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input defaultValue={object.label} onBlur={(e) => onPatch({ label: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Width</Label>
          <Input type="number" defaultValue={object.width} onBlur={(e) => onPatch({ width: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Height</Label>
          <Input type="number" defaultValue={object.height} onBlur={(e) => onPatch({ height: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Rotation</Label>
        <Input type="number" defaultValue={object.rotation} onBlur={(e) => onPatch({ rotation: Number(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Color</Label>
        <Input type="color" defaultValue={object.color} onBlur={(e) => onPatch({ color: e.target.value })} className="h-9 p-1" />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Locked</Label>
        <Switch checked={object.locked} onCheckedChange={(c) => onPatch({ locked: c })} />
      </div>
    </div>
  )
}
