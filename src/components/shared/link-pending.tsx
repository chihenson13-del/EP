"use client"

import { useLinkStatus } from "next/link"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Place inside a <Link>: shows a spinner the instant the link is tapped, until the destination is ready. */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Loader2 className={cn("size-3.5 animate-spin shrink-0", className)} aria-label="Loading" role="status" />
}
