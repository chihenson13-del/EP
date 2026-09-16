"use client"

import { TABLE_SHAPE_DEFAULTS } from "@/lib/seating"
import type { TableData } from "./types"

const SEAT_STATUS_COLOR: Record<string, string> = {
  EMPTY: "#ffffff",
  ASSIGNED: "#b9a7d8",
  CHECKED_IN: "#8fbf9f",
  VIP: "#d9b872",
  RESERVED: "#d8a7b8",
}

export function TableNode({
  table, selected, selectedChairId, onTablePointerDown, onChairPointerDown, onGuestDrop,
}: {
  table: TableData
  selected: boolean
  selectedChairId: string | null
  onTablePointerDown: (e: React.PointerEvent) => void
  onChairPointerDown: (chairId: string, e: React.PointerEvent) => void
  onGuestDrop: (chairId: string, guestId: string) => void
}) {
  const kind = TABLE_SHAPE_DEFAULTS[table.shape].kind
  const isRound = kind === "round"
  const isOval = kind === "oval"

  return (
    <g transform={`translate(${table.x} ${table.y}) rotate(${table.rotation})`}>
      {isRound ? (
        <circle
          r={Math.max(table.width, table.height) / 2}
          fill={table.color}
          stroke={selected ? "var(--brand-purple-deep)" : table.borderColor}
          strokeWidth={selected ? table.borderWidth + 1.5 : table.borderWidth}
          onPointerDown={(e) => { e.stopPropagation(); onTablePointerDown(e) }}
          className="cursor-move"
        />
      ) : isOval ? (
        <ellipse
          rx={table.width / 2} ry={table.height / 2}
          fill={table.color}
          stroke={selected ? "var(--brand-purple-deep)" : table.borderColor}
          strokeWidth={selected ? table.borderWidth + 1.5 : table.borderWidth}
          onPointerDown={(e) => { e.stopPropagation(); onTablePointerDown(e) }}
          className="cursor-move"
        />
      ) : (
        <rect
          x={-table.width / 2} y={-table.height / 2} width={table.width} height={table.height} rx={6}
          fill={table.color}
          stroke={selected ? "var(--brand-purple-deep)" : table.borderColor}
          strokeWidth={selected ? table.borderWidth + 1.5 : table.borderWidth}
          onPointerDown={(e) => { e.stopPropagation(); onTablePointerDown(e) }}
          className="cursor-move"
        />
      )}
      {table.labelVisible && (
        <text textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={600} fill="var(--brand-plum)" style={{ pointerEvents: "none" }}>
          {table.name}
        </text>
      )}

      {table.chairs.map((chair) => (
        <g
          key={chair.id}
          transform={`translate(${chair.x} ${chair.y}) rotate(${-table.rotation})`}
          onPointerDown={(e) => { e.stopPropagation(); onChairPointerDown(chair.id, e) }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const guestId = e.dataTransfer.getData("text/guest-id")
            if (guestId) onGuestDrop(chair.id, guestId)
          }}
          className="cursor-pointer"
        >
          <circle
            r={11}
            fill={SEAT_STATUS_COLOR[chair.status]}
            stroke={selectedChairId === chair.id ? "var(--brand-purple-deep)" : "var(--brand-gray)"}
            strokeWidth={selectedChairId === chair.id ? 2.5 : 1.2}
          />
          <text textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="var(--brand-plum)" style={{ pointerEvents: "none" }}>
            {chair.guest ? chair.guest.firstName[0] : chair.seatNumber}
          </text>
        </g>
      ))}
    </g>
  )
}
