"use client"

import { memo } from "react"
import { designTextStyle } from "@/components/editor/text-style"
import type { DesignObject } from "./types"

// Memoised: while one element is dragged or edited, every other element keeps its reference and skips rendering.
export const DesignObjectNode = memo(function DesignObjectNode({
  object, selected, onPointerDown, onResizeStart, onRotateStart,
}: {
  object: DesignObject
  selected: boolean
  onPointerDown: (object: DesignObject, e: React.PointerEvent) => void
  onResizeStart: (object: DesignObject, e: React.PointerEvent) => void
  onRotateStart: (object: DesignObject, e: React.PointerEvent) => void
}) {
  if (object.hidden) return null

  return (
    <g transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})`}>
      <g onPointerDown={(e) => onPointerDown(object, e)} className={object.locked ? "cursor-default" : "cursor-move"}>
        {object.type === "rect" && (
          <rect width={object.width} height={object.height} rx={object.rx ?? 0} fill={object.fill ?? "var(--brand-beige)"} stroke={object.stroke ?? "none"} strokeWidth={object.strokeWidth ?? 0} />
        )}
        {object.type === "ellipse" && (
          <ellipse cx={object.width / 2} cy={object.height / 2} rx={object.width / 2} ry={object.height / 2} fill={object.fill ?? "var(--brand-beige)"} stroke={object.stroke ?? "none"} strokeWidth={object.strokeWidth ?? 0} />
        )}
        {object.type === "image" && object.src && (
          <image href={object.src} width={object.width} height={object.height} preserveAspectRatio="xMidYMid slice" />
        )}
        {object.type === "text" && (
          <foreignObject width={object.width} height={object.height}>
            <div
              style={designTextStyle(object)}
            >
              {object.text || "Text"}
            </div>
          </foreignObject>
        )}
      </g>

      {selected && !object.locked && (
        <>
          <rect x={-2} y={-2} width={object.width + 4} height={object.height + 4} fill="none" stroke="var(--brand-purple-deep)" strokeWidth={1.5} strokeDasharray="4 3" pointerEvents="none" />
          <circle cx={object.width} cy={object.height} r={7} fill="#fff" stroke="var(--brand-purple-deep)" strokeWidth={2} className="cursor-nwse-resize" onPointerDown={(e) => onResizeStart(object, e)} />
          <line x1={object.width / 2} y1={0} x2={object.width / 2} y2={-24} stroke="var(--brand-purple-deep)" strokeWidth={1.5} pointerEvents="none" />
          <circle cx={object.width / 2} cy={-24} r={7} fill="#fff" stroke="var(--brand-purple-deep)" strokeWidth={2} className="cursor-grab" onPointerDown={(e) => onRotateStart(object, e)} />
        </>
      )}
    </g>
  )
})
