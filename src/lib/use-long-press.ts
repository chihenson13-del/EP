"use client"

import { useCallback, useEffect, useRef } from "react"

/**
 * Press-and-hold on touch screens (and right-click with a mouse) to open a guest's quick menu.
 * A normal tap still works as a tap: the click that follows a long press is swallowed, and moving the finger
 * (scrolling the list) cancels the hold. Returns a function that gives the props for one item.
 */
export function useLongPress<T>(onLongPress: (item: T) => void, delay = 450) {
  const timer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const callback = useRef(onLongPress)
  useEffect(() => { callback.current = onLongPress }, [onLongPress])
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const cancel = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    origin.current = null
  }, [])

  return useCallback((item: T) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return // right-click is handled by onContextMenu
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = null
        fired.current = true
        try { navigator.vibrate?.(12) } catch { /* not supported */ }
        callback.current(item)
      }, delay)
    },
    onPointerMove: (e: React.PointerEvent) => {
      const o = origin.current
      if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 10) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Android long-press and desktop right-click: open the menu instead of the browser's own.
      e.preventDefault()
      cancel()
      if (!fired.current) {
        fired.current = true
        callback.current(item)
      }
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return
      fired.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }), [cancel, delay])
}

/** Classes that stop iOS from selecting text or showing its own callout while a guest is being held. */
export const LONG_PRESS_CLASS = "select-none [-webkit-touch-callout:none] touch-manipulation"
