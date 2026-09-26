"use client"

import { ExternalLink, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { normalizeFacebookUrl } from "@/lib/facebook"

/** Messenger-style speech-bubble mark (original drawing, not Meta's logo). */
export function MessengerIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2.5C6.5 2.5 2.25 6.5 2.25 11.65c0 2.72 1.2 5.07 3.15 6.7v3.15l2.93-1.6c1.13.33 2.35.5 3.67.5 5.5 0 9.75-4 9.75-8.75S17.5 2.5 12 2.5Zm.95 11.55-2.46-2.62-4.8 2.62 5.28-5.6 2.52 2.62 4.74-2.62-5.28 5.6Z" />
    </svg>
  )
}

/**
 * Opens the guest's saved Facebook/Messenger link in a new tab (on phones the OS hands it to the Facebook or
 * Messenger app when installed). It is a plain link: nothing is sent, logged or charged, and the organizer writes
 * the message themselves in Facebook.
 */
export function MessageOnFacebookButton({ url, size = "sm", className }: { url: string; size?: "sm" | "default"; className?: string }) {
  // Re-validate at render time too, so only an allowed https Facebook/m.me URL can ever become an href.
  const safe = normalizeFacebookUrl(url)
  if (!safe) return null
  return (
    <Button asChild size={size} variant="outline" className={className}>
      <a href={safe} target="_blank" rel="noopener noreferrer">
        <MessengerIcon /> Message on Facebook
      </a>
    </Button>
  )
}

export function AddFacebookButton({ onClick, size = "sm", className }: { onClick: () => void; size?: "sm" | "default"; className?: string }) {
  return (
    <Button type="button" size={size} variant="ghost" className={className} onClick={onClick}>
      <Plus className="size-3.5" /> Add Facebook
    </Button>
  )
}

/** "Facebook Profile ↗" — shows the link cleanly without printing the whole URL. */
export function FacebookProfileLink({ url }: { url: string }) {
  const safe = normalizeFacebookUrl(url)
  if (!safe) return null
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" title={safe} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      Facebook Profile <ExternalLink className="size-3" aria-hidden />
    </a>
  )
}
