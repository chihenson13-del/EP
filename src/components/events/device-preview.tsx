"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

/** Common phone widths (CSS px): iPhone SE/small Android, iPhone mini/SE 2+, iPhone 14/15, Plus/XR, Pro Max. */
export const PHONE_WIDTHS = [320, 375, 390, 414, 430] as const
export type PhoneWidth = (typeof PHONE_WIDTHS)[number]

type FitResult = { width: number; fits: boolean; offenders: string[] } | null

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40)
  return text ? `${tag} “${text}${text.length === 40 ? "…" : ""}”` : tag
}

/**
 * Measures the invitation inside the (same-origin) frame: is anything wider than the screen? This is the same
 * check a browser's dev tools would do — document scroll width vs. viewport, plus the elements sticking out.
 */
function measure(frame: HTMLIFrameElement | null): FitResult {
  try {
    const doc = frame?.contentDocument
    const win = frame?.contentWindow
    if (!doc || !win) return null
    const viewport = doc.documentElement.clientWidth
    const scroll = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth ?? 0)
    const sticking = new Set<Element>()
    for (const el of Array.from(doc.body?.querySelectorAll("*") ?? [])) {
      const style = win.getComputedStyle(el)
      if (style.position === "fixed" || style.display === "none" || style.visibility === "hidden") continue
      const r = el.getBoundingClientRect()
      // Decorations are allowed to bleed into a clipped hero; everything with content must fit.
      if (el.closest('[aria-hidden="true"], [data-clip-ok]')) continue
      if (r.width > 0 && (r.right > viewport + 1 || r.left < -1)) sticking.add(el)
    }
    // Report the outermost elements that stick out (their children follow them).
    const offenders = Array.from(sticking)
      .filter((el) => { for (let p = el.parentElement; p; p = p.parentElement) if (sticking.has(p)) return false; return true })
      .slice(0, 3)
      .map(describe)
    // Fits = the page doesn't scroll sideways AND no content is cut off at the edge (the invitation clips
    // overflow as a safety net, so clipped content would otherwise go unnoticed).
    const fits = scroll <= viewport + 1 && offenders.length === 0
    return { width: viewport, fits, offenders: fits ? [] : offenders }
  } catch {
    return null
  }
}

/**
 * The invitation shown at a real device width. The frame's INNER width is exactly the chosen width (the phone
 * bezel is drawn outside it), so what you see is what a guest's phone renders. Scrolls vertically inside.
 */
export function DeviceFrame({ src, width, kind, onLoaded, className }: { src: string; width: number | null; kind: "phone" | "tablet" | "desktop"; onLoaded?: () => void; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [fit, setFit] = useState<FitResult>(null)

  const check = useCallback(() => setFit(measure(ref.current)), [])

  useEffect(() => {
    if (!loaded) return
    check()
    // Re-check once fonts, images and the countdown have settled.
    const t1 = setTimeout(check, 1200)
    const t2 = setTimeout(check, 3500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [loaded, check])

  const bezel = kind === "phone" ? 12 : kind === "tablet" ? 14 : 0
  const height = kind === "phone" && width ? `min(78vh, ${Math.round(width * 2.05)}px)` : "min(78vh, 900px)"

  return (
    <div className={cn("flex flex-col items-center gap-3 w-full", className)}>
      <div
        className={cn("relative bg-white shadow-xl overflow-hidden max-w-full", kind === "desktop" ? "rounded-xl w-full border" : kind === "phone" ? "rounded-[2.4rem]" : "rounded-[1.6rem]")}
        style={width ? { width: width + bezel * 2, padding: bezel, background: "#1f1a24" } : undefined}
      >
        {kind === "phone" && <div className="absolute left-1/2 top-[14px] z-20 h-[18px] w-[34%] max-w-28 -translate-x-1/2 rounded-full bg-[#1f1a24]" aria-hidden />}
        <div className={cn("relative overflow-hidden bg-white", kind === "phone" ? "rounded-[1.8rem]" : kind === "tablet" ? "rounded-[1rem]" : "")}>
          {!loaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-sm text-muted-foreground" role="status">
              Loading your invitation…
            </div>
          )}
          <iframe
            ref={ref}
            title="Invitation preview"
            src={src}
            onLoad={() => { setLoaded(true); onLoaded?.() }}
            className="block bg-white"
            style={{ width: width ?? "100%", maxWidth: "100%", height, border: 0 }}
          />
        </div>
      </div>
      {loaded && fit && (
        <p className={cn("flex items-center gap-1.5 text-xs", fit.fits ? "text-emerald-700" : "text-amber-700")} role="status">
          {fit.fits ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {fit.fits
            ? `Fits a ${fit.width}px-wide screen: scrolls up and down only, no sideways dragging.`
            : `Something is wider than this ${fit.width}px screen${fit.offenders.length ? `: ${fit.offenders.join(", ")}` : ""}.`}
        </p>
      )}
    </div>
  )
}

/** Width chips for the phone preview. */
export function PhoneWidthPicker({ value, onChange }: { value: number; onChange: (w: PhoneWidth) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Phone width">
      {PHONE_WIDTHS.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          aria-pressed={value === w}
          className={cn("h-8 rounded-md border px-2.5 text-xs font-medium tabular-nums transition-colors cursor-pointer", value === w ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary")}
        >
          {w}px
        </button>
      ))}
    </div>
  )
}
