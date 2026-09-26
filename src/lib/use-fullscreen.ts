"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Full-screen for an editor. Uses the browser's real full-screen mode where it exists, and always also switches
 * the editor to fill the whole window (so it works on iPhone too, where web pages can't go truly full-screen).
 */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setOn(false) }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  useEffect(() => {
    if (!on) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [on])

  const toggle = useCallback(() => {
    if (on) {
      setOn(false)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
      return
    }
    setOn(true)
    const el = ref.current
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => undefined)
  }, [on])

  return { ref, on, toggle, className: on ? "fixed inset-0 z-[60] h-dvh w-screen bg-background" : "" }
}
