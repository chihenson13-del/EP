"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="font-heading text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-sm">
        An unexpected error occurred. This has been logged — please try again, and contact support if it keeps happening.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
