"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  ZoomIn, ZoomOut, Maximize, Grid3x3, Undo2, Redo2, Trash2, Copy, Lock, LockOpen, Plus,
} from "lucide-react"
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
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: floorPlan.width, h: floorPlan.height })
  const [showGrid, setShowGrid] = useState(true)
  const [guestSearch, setGuestSearch] = useState("")
  const svgRef = useRef<SVGSVGElement>(null)
  const historyRef = useRef<{ tables: TableData[]; objects: FloorObjectData[] }[]>([])
  const redoRef = useRef<{ tables: TableData[]; objects: FloorObjectData[] }[]>([])
  const dragRef = useRef<null | { kind: "table" | "object" | "chair"; id: string; tableId?: string; startSvg: { x: number; y: number }; startPos: { x: number; y: number }; tableRotation?: number }>(null)

  // Latest state for handlers that must stay referentially stable (so memoised nodes don't re-render
  // on every mouse move). State is only ever replaced, never mutated, so history can hold references.
  const tablesRef = useRef(tables)
  const objectsRef = useRef(objects)
  useEffect(() => {
    tablesRef.current = tables
    objectsRef.current = objects
  })
  const moveFrame = useRef<number | null>(null)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)

  const snapshot = useCallback(() => {
    historyRef.current.push({ tables: tablesRef.current, objects: objectsRef.current })
    if (historyRef.current.length > 50) historyRef.current.shift()
    redoRef.current = []
  }, [])

  /** Persist positions. Undo/redo passes the whole layout; a drag passes only the item that moved. */
  const once = useSingleFlight()
  async function syncLayout(layout: { tables: TableData[]; objects: FloorObjectData[] }) {
    const result = await safe(bulkSyncLayout(eventId, {
      tables: layout.tables.map((t) => ({ id: t.id, x: t.x, y: t.y, rotation: t.rotation })),
      objects: layout.objects.map((o) => ({ id: o.id, x: o.x, y: o.y, rotation: o.rotation, width: o.width, height: o.height })),
    }))
    if (!result.ok) toast.error(`Your layout change couldn't be saved: ${result.error}`)
  }

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

  const onPointerDownTable = useCallback((table: TableData, e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    if (table.locked) { setSelection({ kind: "table", id: table.id }); return }
    snapshot()
    const p = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { kind: "table", id: table.id, startSvg: { x: p.x, y: p.y }, startPos: { x: table.x, y: table.y } }
    setSelection({ kind: "table", id: table.id })
  }, [snapshot])

  const onPointerDownObject = useCallback((obj: FloorObjectData, e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    if (obj.locked) { setSelection({ kind: "object", id: obj.id }); return }
    snapshot()
    const p = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { kind: "object", id: obj.id, startSvg: { x: p.x, y: p.y }, startPos: { x: obj.x, y: obj.y } }
    setSelection({ kind: "object", id: obj.id })
  }, [snapshot])

  const onPointerDownChair = useCallback((table: TableData, chairId: string, e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const chair = table.chairs.find((c) => c.id === chairId)
    if (!chair) return
    snapshot()
    const p = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { kind: "chair", id: chairId, tableId: table.id, startSvg: { x: p.x, y: p.y }, startPos: { x: chair.x, y: chair.y }, tableRotation: table.rotation }
    setSelection({ kind: "chair", id: chairId, tableId: table.id })
  }, [snapshot])

  /** Apply the latest pointer position to the dragged item. Runs at most once per animation frame. */
  function applyDrag() {
    moveFrame.current = null
    const drag = dragRef.current
    const pointer = lastPointer.current
    if (!drag || !pointer) return
    const p = toSvgPoint(pointer.x, pointer.y)
    const dx = p.x - drag.startSvg.x
    const dy = p.y - drag.startSvg.y

    if (drag.kind === "table") {
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

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    lastPointer.current = { x: e.clientX, y: e.clientY }
    if (moveFrame.current === null) moveFrame.current = requestAnimationFrame(applyDrag)
  }

  async function handlePointerUp() {
    const drag = dragRef.current
    if (!drag) return
    if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current)
    applyDrag()
    dragRef.current = null

    // Save only what moved, not the whole floor plan.
    if (drag.kind === "table") {
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

  function handleBackgroundPointerDown(e: React.PointerEvent) {
    if (e.target !== svgRef.current) return
    setSelection(null)
    const startClient = { x: e.clientX, y: e.clientY }
    const startView = { ...viewBox }
    const svg = svgRef.current!
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const scale = viewBox.w / svg.clientWidth

    function move(ev: PointerEvent) {
      const dx = (ev.clientX - startClient.x) * scale
      const dy = (ev.clientY - startClient.y) * scale
      setViewBox({ ...startView, x: startView.x - dx, y: startView.y - dy })
    }
    function up() {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  function zoom(factor: number) {
    setViewBox((v) => {
      const cx = v.x + v.w / 2
      const cy = v.y + v.h / 2
      const w = Math.min(Math.max(v.w * factor, floorPlan.width * 0.3), floorPlan.width * 3)
      const h = w * (v.h / v.w)
      return { x: cx - w / 2, y: cy - h / 2, w, h }
    })
  }

  function fitToScreen() {
    setViewBox({ x: 0, y: 0, w: floorPlan.width, h: floorPlan.height })
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
    // Re-derive the created table+chairs from the latest local createTable defaults (no extra round-trip needed
    // since createTable already computed geometry server-side); we refetch via a light client call instead.
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

  async function handleDeleteSelection() {
    if (selection?.kind === "table") {
      const result = await safe(deleteTable(eventId, selection.id))
      if (!result.ok) return void toast.error(result.error)
      setTables((prev) => prev.filter((t) => t.id !== selection.id))
    } else if (selection?.kind === "object") {
      const result = await safe(deleteFloorObject(eventId, selection.id))
      if (!result.ok) return void toast.error(result.error)
      setObjects((prev) => prev.filter((o) => o.id !== selection.id))
    }
    setSelection(null)
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
    if (fresh) setTables((prev) => [...prev, fresh])
      })
  }

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

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      <div className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r bg-card p-3 overflow-y-auto space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Guests</p>
          <Input placeholder="Search guests..." value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} className="mb-2" />
          <p className="text-xs text-muted-foreground mb-2">{assignedCount}/{totalCapacity} seated · drag a guest onto a seat</p>
          <div className="space-y-1 max-h-[calc(100vh-20rem)] overflow-y-auto">
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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-card p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm"><Plus className="size-3.5" /> Table</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(TABLE_GROUPS).map(([group, shapes]) => (
                <div key={group}>
                  <DropdownMenuLabel className="text-xs">{group}</DropdownMenuLabel>
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
          <Button size="icon" variant="ghost" className="size-8" onClick={undo}><Undo2 className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={redo}><Redo2 className="size-4" /></Button>
          <div className="h-5 w-px bg-border mx-1" />
          <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(0.8)}><ZoomIn className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => zoom(1.25)}><ZoomOut className="size-4" /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={fitToScreen}><Maximize className="size-4" /></Button>
          <Button size="icon" variant={showGrid ? "secondary" : "ghost"} className="size-8" onClick={() => setShowGrid((v) => !v)}><Grid3x3 className="size-4" /></Button>
          {selection && (
            <>
              <div className="h-5 w-px bg-border mx-1" />
              {selection.kind === "table" && <Button size="icon" variant="ghost" className="size-8" onClick={handleDuplicateTable}><Copy className="size-4" /></Button>}
              {(selection.kind === "table" || selection.kind === "object") && (
                <Button size="icon" variant="ghost" className="size-8" onClick={handleDeleteSelection}><Trash2 className="size-4 text-destructive" /></Button>
              )}
            </>
          )}
        </div>

        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="flex-1 bg-secondary/20 touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerDown={handleBackgroundPointerDown}
        >
          <defs>
            <pattern id="grid" width={floorPlan.gridSize} height={floorPlan.gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${floorPlan.gridSize} 0 L 0 0 0 ${floorPlan.gridSize}`} fill="none" stroke="#00000012" strokeWidth={1} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={floorPlan.width} height={floorPlan.height} fill={floorPlan.backgroundColor} />
          {showGrid && <rect x={0} y={0} width={floorPlan.width} height={floorPlan.height} fill="url(#grid)" />}

          {objects.map((o) => (
            <ObjectNode
              key={o.id}
              object={o}
              selected={selection?.kind === "object" && selection.id === o.id}
              onPointerDown={onPointerDownObject}
            />
          ))}

          {tables.map((t) => (
            <TableNode
              key={t.id}
              table={t}
              selected={selection?.kind === "table" && selection.id === t.id}
              selectedChairId={selection?.kind === "chair" ? selection.id : null}
              onTablePointerDown={onPointerDownTable}
              onChairPointerDown={onPointerDownChair}
              onGuestDrop={onGuestDrop}
            />
          ))}
        </svg>
      </div>

      <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l bg-card p-4 overflow-y-auto">
        {!selection && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Nothing selected</p>
            <p>Click a table, seat, or object to edit it. Drag the background to pan.</p>
          </div>
        )}
        {selectedTable && selection?.kind === "table" && (
          <TableSettingsPanel table={selectedTable} onPatch={patchSelectedTable} />
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
          <ObjectSettingsPanel object={selectedObject} onPatch={async (patch) => {
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
