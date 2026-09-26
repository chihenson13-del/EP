"use client"

import { memo, useEffect, useRef } from "react"
import { designTextStyle } from "@/components/editor/text-style"
import type { DesignObject } from "./types"

/** Resize handles: [x direction, y direction] — -1 = left/top edge, 1 = right/bottom edge, 0 = middle. */
const HANDLES: Array<[number, number, string]> = [
  [-1, -1, "nwse"], [0, -1, "ns"], [1, -1, "nesw"],
  [1, 0, "ew"], [1, 1, "nwse"], [0, 1, "ns"],
  [-1, 1, "nesw"], [-1, 0, "ew"],
]

// Memoised: while one element is dragged or edited, every other element keeps its reference and skips rendering.
export const DesignObjectNode = memo(function DesignObjectNode({
  object, selected, showHandles, handleScale, editing, onPointerDown, onResizeStart, onRotateStart, onDoubleClick, onTextCommit,
}: {
  object: DesignObject
  selected: boolean
  /** Handles only for a single selected, unlocked element. */
  showHandles: boolean
  /** SVG units per screen pixel, so handles stay the same size on screen at any zoom. */
  handleScale: number
  editing: boolean
  onPointerDown: (object: DesignObject, e: React.PointerEvent) => void
  onResizeStart: (object: DesignObject, e: React.PointerEvent, hx: number, hy: number) => void
  onRotateStart: (object: DesignObject, e: React.PointerEvent) => void
  onDoubleClick: (object: DesignObject) => void
  onTextCommit: (object: DesignObject, text: string | null) => void
}) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!editing) return
    const el = textRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  if (object.hidden) return null
  const r = 6 * handleScale
  const clipId = `clip-${object.id}`

  return (
    <g transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})`} opacity={object.opacity ?? 1}>
      <g
        onPointerDown={(e) => onPointerDown(object, e)}
        onDoubleClick={() => onDoubleClick(object)}
        className={object.locked ? "cursor-default" : "cursor-move"}
      >
        {object.type === "rect" && (
          <rect width={object.width} height={object.height} rx={object.rx ?? 0} fill={object.fill ?? "var(--brand-beige)"} stroke={object.stroke ?? "none"} strokeWidth={object.strokeWidth ?? 0} />
        )}
        {object.type === "ellipse" && (
          <ellipse cx={object.width / 2} cy={object.height / 2} rx={object.width / 2} ry={object.height / 2} fill={object.fill ?? "var(--brand-beige)"} stroke={object.stroke ?? "none"} strokeWidth={object.strokeWidth ?? 0} />
        )}
        {object.type === "image" && (
          object.src ? (
            <>
              {(object.rx ?? 0) > 0 && <defs><clipPath id={clipId}><rect width={object.width} height={object.height} rx={object.rx} /></clipPath></defs>}
              <image href={object.src} width={object.width} height={object.height} preserveAspectRatio="xMidYMid slice" clipPath={(object.rx ?? 0) > 0 ? `url(#${clipId})` : undefined} />
            </>
          ) : (
            <g>
              <rect width={object.width} height={object.height} fill="#f4f1ec" stroke="#c9c0b4" strokeDasharray="6 4" />
              <text x={object.width / 2} y={object.height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(18, object.width / 8)} fill="#8c8278">Add a photo →</text>
            </g>
          )
        )}
        {object.type === "text" && (
          <foreignObject width={object.width} height={object.height}>
            {editing ? (
              <textarea
                ref={textRef}
                defaultValue={object.text ?? ""}
                onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => onTextCommit(object, e.currentTarget.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === "Escape") onTextCommit(object, null)
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.currentTarget as HTMLTextAreaElement).blur()
                }}
                style={{ ...designTextStyle(object), display: "block", resize: "none", border: "none", outline: "2px solid var(--brand-purple-deep)", background: "rgb(255 255 255 / 0.85)", overflow: "hidden" }}
                aria-label="Edit text"
              />
            ) : (
              <div style={designTextStyle(object)}>{object.text || "Text"}</div>
            )}
          </foreignObject>
        )}
      </g>

      {selected && (
        <rect x={-2 * handleScale} y={-2 * handleScale} width={object.width + 4 * handleScale} height={object.height + 4 * handleScale} fill="none"
          stroke={object.locked ? "#b3a9bd" : "var(--brand-purple-deep)"} strokeWidth={1.5 * handleScale} strokeDasharray={`${4 * handleScale} ${3 * handleScale}`} pointerEvents="none" />
      )}
      {showHandles && !editing && (
        <>
          <line x1={object.width / 2} y1={0} x2={object.width / 2} y2={-28 * handleScale} stroke="var(--brand-purple-deep)" strokeWidth={1.5 * handleScale} pointerEvents="none" />
          <circle cx={object.width / 2} cy={-28 * handleScale} r={r * 1.15} fill="#fff" stroke="var(--brand-purple-deep)" strokeWidth={2 * handleScale} className="cursor-grab" onPointerDown={(e) => onRotateStart(object, e)} />
          {HANDLES.map(([hx, hy, cursor]) => (
            <rect
              key={`${hx}${hy}`}
              x={((hx + 1) / 2) * object.width - r} y={((hy + 1) / 2) * object.height - r} width={r * 2} height={r * 2} rx={hx && hy ? r : r / 3}
              fill="#fff" stroke="var(--brand-purple-deep)" strokeWidth={2 * handleScale}
              style={{ cursor: `${cursor}-resize` }}
              onPointerDown={(e) => onResizeStart(object, e, hx, hy)}
            />
          ))}
        </>
      )}
    </g>
  )
})
