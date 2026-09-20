"use client"

import { useCallback, useRef } from "react"

/**
 * Runs an async action at most once at a time. The guard is a ref, so it flips SYNCHRONOUSLY: a fast
 * double-click, double-Enter, or a click during the first request is ignored even before React has
 * re-rendered the button as disabled (state-based `disabled` alone lets those through). Use it on actions that
 * CREATE or SEND something; the loading state still drives the button's label.
 */
export function useSingleFlight() {
  const busy = useRef(false)
  return useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.current) return undefined
    busy.current = true
    try {
      return await fn()
    } finally {
      busy.current = false
    }
  }, [])
}
