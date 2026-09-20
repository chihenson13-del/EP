"use client"

import { memo } from "react"
import { FLOOR_OBJECT_LABELS } from "@/lib/seating"
import type { FloorObjectData } from "./types"

export const ObjectNode = memo(function ObjectNode({ object, selected, onPointerDown }: { object: FloorObjectData; selected: boolean; onPointerDown: (object: FloorObjectData, e: React.PointerEvent) => void }) {
  return (
    <g transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})`} onPointerDown={(e) => { e.stopPropagation(); onPointerDown(object, e) }} className="cursor-move">
      <rect
        x={-object.width / 2} y={-object.height / 2} width={object.width} height={object.height} rx={8}
        fill={object.color}
        stroke={selected ? "var(--brand-purple-deep)" : "var(--brand-taupe)"}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeDasharray="6 3"
      />
      <text textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={600} fill="var(--brand-plum)" style={{ pointerEvents: "none" }}>
        {object.label || FLOOR_OBJECT_LABELS[object.type]}
      </text>
    </g>
  )
})
