"use client"

import { useEffect, useState } from "react"
import { Expand, X } from "lucide-react"

/**
 * The owner's designed invitation card scales down to fit the phone like a picture (so the page never scrolls
 * sideways). Small print on a large design can get tiny on a phone, so guests can tap it to open it full screen
 * at full size and pan around inside that viewer — the page itself stays vertical-only.
 */
export function ZoomableDesign({ width, children }: { width: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey) }
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group relative block w-full cursor-zoom-in text-left" aria-label="Open the invitation design full screen">
        {children}
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-90 transition-opacity">
          <Expand className="size-3" aria-hidden /> Tap to enlarge
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="Invitation design">
          <div className="flex justify-end p-2">
            <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-medium text-white cursor-pointer" autoFocus>
              <X className="size-4" aria-hidden /> Close
            </button>
          </div>
          <div className="flex-1 overflow-auto overscroll-contain p-3">
            <div className="mx-auto" style={{ width: `max(100%, min(${width}px, 200vw))` }}>{children}</div>
          </div>
        </div>
      )}
    </>
  )
}
