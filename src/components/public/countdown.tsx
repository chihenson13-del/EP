"use client"

import { useEffect, useState } from "react"

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    // Intentional: `now` starts null so the server and first client render match (no Date.now()
    // during SSR), then we set the real clock only after mount to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (now === null) return null

  const diff = Math.max(0, new Date(target).getTime() - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ]

  return (
    // Four equal columns that shrink with the screen (never wider than the container, even at 320px).
    <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5 sm:gap-6" role="timer" aria-live="off">
      {units.map((u) => (
        <div key={u.label} className="min-w-0 text-center">
          <div className="font-heading text-[clamp(1.5rem,8vw,2.25rem)] font-bold leading-tight tabular-nums">{String(u.value).padStart(2, "0")}</div>
          <div className="text-[0.625rem] sm:text-xs uppercase tracking-wide opacity-70">{u.label}</div>
        </div>
      ))}
    </div>
  )
}
