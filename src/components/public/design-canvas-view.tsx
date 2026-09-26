import { designTextStyle } from "@/components/editor/text-style"
import type { DesignObject } from "@/components/editor/types"

/**
 * Static, read-only rendering of the saved invitation design (the same shapes the editor draws), shown
 * on the public invitation and in the owner's preview. Server-renderable: no state, no handlers.
 */
export function DesignCanvasView({ width, height, objects }: { width: number; height: number; objects: DesignObject[] }) {
  const visible = objects.filter((o) => !o.hidden).sort((a, b) => a.zIndex - b.zIndex)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-xl shadow-sm bg-white" role="img" aria-label="Invitation design">
      <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
      {visible.map((o) => (
        <g key={o.id} transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}>
          {o.type === "rect" && <rect width={o.width} height={o.height} rx={o.rx ?? 0} fill={o.fill ?? "var(--brand-beige)"} stroke={o.stroke ?? "none"} strokeWidth={o.strokeWidth ?? 0} />}
          {o.type === "ellipse" && <ellipse cx={o.width / 2} cy={o.height / 2} rx={o.width / 2} ry={o.height / 2} fill={o.fill ?? "var(--brand-beige)"} stroke={o.stroke ?? "none"} strokeWidth={o.strokeWidth ?? 0} />}
          {o.type === "image" && o.src && <image href={o.src} width={o.width} height={o.height} preserveAspectRatio="xMidYMid slice" />}
          {o.type === "text" && (
            <foreignObject width={o.width} height={o.height}>
              <div
                style={designTextStyle(o)}
              >
                {o.text || ""}
              </div>
            </foreignObject>
          )}
        </g>
      ))}
    </svg>
  )
}

export function hasVisibleDesign(objects: unknown): objects is DesignObject[] {
  return Array.isArray(objects) && objects.some((o) => o && !(o as DesignObject).hidden)
}
