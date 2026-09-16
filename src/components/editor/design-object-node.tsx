"use client"

import type { DesignObject } from "./types"

export function DesignObjectNode({
  object, selected, onPointerDown, onResizeStart, onRotateStart,
}: {
  object: DesignObject
  selected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent) => void
  onRotateStart: (e: React.PointerEvent) => void
}) {
  if (object.hidden) return null

  return (
    <g transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})`}>
      <g onPointerDown={onPointerDown} className={object.locked ? "cursor-default" : "cursor-move"}>
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
              style={{
                width: "100%", height: "100%", display: "flex", alignItems: "center",
                justifyContent: object.align === "left" ? "flex-start" : object.align === "right" ? "flex-end" : "center",
                fontSize: object.fontSize ?? 24, color: object.color ?? "var(--brand-plum)", fontWeight: object.fontWeight ?? 600,
                fontFamily: object.fontFamily ?? "inherit", textAlign: object.align ?? "center", whiteSpace: "pre-wrap", wordBreak: "break-word",
                lineHeight: 1.2, padding: 4,
              }}
            >
              {object.text || "Text"}
            </div>
          </foreignObject>
        )}
      </g>

      {selected && !object.locked && (
        <>
          <rect x={-2} y={-2} width={object.width + 4} height={object.height + 4} fill="none" stroke="var(--brand-purple-deep)" strokeWidth={1.5} strokeDasharray="4 3" pointerEvents="none" />
          <circle cx={object.width} cy={object.height} r={7} fill="#fff" stroke="var(--brand-purple-deep)" strokeWidth={2} className="cursor-nwse-resize" onPointerDown={onResizeStart} />
          <line x1={object.width / 2} y1={0} x2={object.width / 2} y2={-24} stroke="var(--brand-purple-deep)" strokeWidth={1.5} pointerEvents="none" />
          <circle cx={object.width / 2} cy={-24} r={7} fill="#fff" stroke="var(--brand-purple-deep)" strokeWidth={2} className="cursor-grab" onPointerDown={onRotateStart} />
        </>
      )}
    </g>
  )
}
