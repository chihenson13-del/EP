"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

/**
 * No SessionProvider: nothing reads the session on the client (pages get it from the server), and the
 * provider would fetch /api/auth/session on every load and again on every tab focus.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  )
}
