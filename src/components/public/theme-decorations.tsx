import type { Decoration, Divider } from "@/lib/themes"

/**
 * Original, lightweight SVG ornaments for the theme system (drawn for Events Partner — no third-party artwork).
 * All color comes from the theme via currentColor / CSS variables, so every theme recolors them automatically.
 * Server-renderable and purely decorative (aria-hidden).
 */

function Corner({ children, className }: { children: React.ReactNode; className: string }) {
  return <svg viewBox="0 0 120 120" className={`pointer-events-none absolute size-28 sm:size-40 ${className}`} aria-hidden fill="none">{children}</svg>
}

function FloralSprig() {
  return (
    <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M6 114 C 30 90, 50 70, 64 40 S 90 12, 114 6" />
      <path d="M30 88 c -8 -14 -2 -24 10 -26 c 2 12 -2 22 -10 26z" fill="currentColor" fillOpacity=".18" />
      <path d="M50 64 c 14 -6 24 0 26 12 c -12 2 -22 -2 -26 -12z" fill="currentColor" fillOpacity=".18" />
      <path d="M66 36 c -6 -14 0 -24 12 -26 c 2 12 -2 22 -12 26z" fill="currentColor" fillOpacity=".18" />
      <circle cx="92" cy="16" r="7" fill="currentColor" fillOpacity=".25" />
      <circle cx="92" cy="16" r="3" fill="currentColor" fillOpacity=".6" />
      <circle cx="22" cy="100" r="5" fill="currentColor" fillOpacity=".25" />
    </g>
  )
}

function Leaves() {
  return (
    <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M4 116 Q 60 70 116 4" />
      {[18, 36, 54, 72, 90].map((t, i) => (
        <g key={t} transform={`translate(${t} ${116 - t * 0.98}) rotate(${-45})`}>
          <path d={i % 2 ? "M0 0 c 6 -12 18 -14 24 -10 c -4 8 -14 12 -24 10z" : "M0 0 c 12 6 14 18 10 24 c -8 -4 -12 -14 -10 -24z"} fill="currentColor" fillOpacity=".2" />
        </g>
      ))}
    </g>
  )
}

function Palm() {
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="currentColor" fillOpacity=".16">
      <path d="M100 120 C 96 90, 90 60, 70 40" fill="none" />
      <path d="M70 40 C 50 30, 30 32, 12 44 C 30 40, 48 42, 70 40z" />
      <path d="M70 40 C 62 20, 48 8, 28 4 C 44 14, 56 24, 70 40z" />
      <path d="M70 40 C 80 22, 96 12, 116 12 C 98 20, 86 28, 70 40z" />
      <path d="M70 40 C 88 38, 104 46, 116 60 C 100 52, 86 48, 70 40z" />
    </g>
  )
}

function Deco() {
  return (
    <g stroke="currentColor" strokeWidth="1.2">
      <path d="M8 8 H 80 M8 8 V 80" />
      <path d="M16 16 H 60 M16 16 V 60" />
      <path d="M8 8 L 40 40" strokeOpacity=".5" />
      <rect x="36" y="36" width="8" height="8" transform="rotate(45 40 40)" fill="currentColor" fillOpacity=".35" />
    </g>
  )
}

function Twine() {
  return (
    <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="5 4">
      <path d="M0 30 Q 60 60 120 24" />
      <path d="M0 36 Q 60 66 120 30" strokeOpacity=".5" />
    </g>
  )
}

/** Scattered shapes across the whole hero (confetti, dots, stars, balloons, geometric). */
function Scatter({ kind }: { kind: "confetti" | "dots" | "stars" | "balloons" | "geometric" }) {
  const spots = [[6, 12], [18, 70], [30, 28], [44, 84], [58, 16], [70, 62], [82, 30], [92, 78], [12, 44], [88, 8], [50, 50], [24, 92]]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      {spots.map(([x, y], i) => {
        const o = 0.18 + (i % 4) * 0.08
        if (kind === "dots") return <circle key={i} cx={x} cy={y} r={0.9 + (i % 3) * 0.5} fill="currentColor" fillOpacity={o} />
        if (kind === "stars") return <path key={i} d={`M${x} ${y - 1.4} L${x + 0.4} ${y - 0.4} L${x + 1.4} ${y} L${x + 0.4} ${y + 0.4} L${x} ${y + 1.4} L${x - 0.4} ${y + 0.4} L${x - 1.4} ${y} L${x - 0.4} ${y - 0.4}Z`} fill="currentColor" fillOpacity={o + 0.2} />
        if (kind === "geometric") return i % 2 ? <rect key={i} x={x} y={y} width="2.4" height="2.4" fill="none" stroke="currentColor" strokeOpacity={o + 0.1} strokeWidth=".3" transform={`rotate(${i * 15} ${x} ${y})`} /> : <line key={i} x1={x} y1={y} x2={x + 4} y2={y} stroke="currentColor" strokeOpacity={o + 0.1} strokeWidth=".3" />
        if (kind === "balloons") return i % 3 === 0 ? (
          <g key={i} fill="currentColor" fillOpacity={o + 0.08}>
            <ellipse cx={x} cy={y} rx="2.6" ry="3.2" />
            <path d={`M${x} ${y + 3.2} q .6 3 -.4 6`} stroke="currentColor" strokeOpacity={o + 0.1} strokeWidth=".25" fill="none" />
          </g>
        ) : null
        return <rect key={i} x={x} y={y} width="1.8" height="0.8" rx=".3" fill="currentColor" fillOpacity={o + 0.1} transform={`rotate(${i * 37} ${x} ${y})`} />
      })}
    </svg>
  )
}

export function HeroDecoration({ decoration }: { decoration: Decoration }) {
  switch (decoration) {
    case "floral":
      return (<><Corner className="left-0 top-0"><FloralSprig /></Corner><Corner className="right-0 bottom-0 rotate-180"><FloralSprig /></Corner></>)
    case "leaves":
      return (<><Corner className="left-0 bottom-0"><Leaves /></Corner><Corner className="right-0 top-0 rotate-180"><Leaves /></Corner></>)
    case "palm":
      return (<><Corner className="right-0 top-0"><Palm /></Corner><Corner className="left-0 top-0 -scale-x-100"><Palm /></Corner></>)
    case "deco":
      return (<><Corner className="left-2 top-2"><Deco /></Corner><Corner className="right-2 top-2 -scale-x-100"><Deco /></Corner><Corner className="left-2 bottom-2 -scale-y-100"><Deco /></Corner><Corner className="right-2 bottom-2 rotate-180"><Deco /></Corner></>)
    case "twine":
      return <svg viewBox="0 0 120 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 h-16 w-full" aria-hidden fill="none"><Twine /></svg>
    case "gold-lines":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-3 sm:inset-5 size-auto" style={{ width: "calc(100% - 2.5rem)", height: "calc(100% - 2.5rem)" }} aria-hidden fill="none">
          <rect x=".5" y=".5" width="99" height="99" stroke="currentColor" strokeOpacity=".45" strokeWidth=".25" vectorEffect="non-scaling-stroke" />
          <rect x="2" y="2" width="96" height="96" stroke="currentColor" strokeOpacity=".25" strokeWidth=".25" vectorEffect="non-scaling-stroke" />
        </svg>
      )
    case "waves":
      return (
        <svg viewBox="0 0 120 20" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full" aria-hidden>
          <path d="M0 12 Q 15 4 30 12 T 60 12 T 90 12 T 120 12 V20 H0Z" fill="currentColor" fillOpacity=".12" />
          <path d="M0 15 Q 15 8 30 15 T 60 15 T 90 15 T 120 15 V20 H0Z" fill="currentColor" fillOpacity=".12" />
        </svg>
      )
    case "confetti":
    case "dots":
    case "stars":
    case "balloons":
    case "geometric":
      return <Scatter kind={decoration} />
    default:
      return null
  }
}

export function SectionDivider({ divider }: { divider: Divider }) {
  if (divider === "none") return null
  return (
    <div className="flex justify-center py-2" aria-hidden style={{ color: "var(--ep-accent)" }}>
      {divider === "line" && <span className="block h-px w-24" style={{ background: "var(--ep-border)" }} />}
      {divider === "dots" && <span className="flex gap-2">{[0, 1, 2].map((i) => <span key={i} className="block size-1.5 rounded-full bg-current opacity-60" />)}</span>}
      {divider === "wave" && <svg viewBox="0 0 60 8" className="h-2 w-16" fill="none"><path d="M0 4 Q 7.5 0 15 4 T 30 4 T 45 4 T 60 4" stroke="currentColor" strokeWidth="1.2" /></svg>}
      {divider === "ornament" && (
        <svg viewBox="0 0 80 12" className="h-3 w-24" fill="none">
          <path d="M0 6 H30 M50 6 H80" stroke="currentColor" strokeOpacity=".6" strokeWidth=".8" />
          <path d="M40 1 L44 6 L40 11 L36 6Z" fill="currentColor" fillOpacity=".7" />
        </svg>
      )}
    </div>
  )
}
