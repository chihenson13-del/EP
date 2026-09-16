import { cn } from "@/lib/utils"

/**
 * Minimal abstract mark: an open invitation card with a folded corner — reads as
 * "envelope / invitation / connection" without leaning on any single event type
 * (no rings, no cake, nothing wedding- or birthday-specific).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)} aria-hidden="true">
      <rect x="3" y="6" width="26" height="20" rx="4" fill="var(--brand-lavender)" />
      <path d="M3 10.5 L16 19 L29 10.5" stroke="var(--brand-purple-deep)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="3" y="6" width="26" height="20" rx="4" stroke="var(--brand-purple-deep)" strokeWidth="1.25" fill="none" />
      <circle cx="16" cy="6" r="2.25" fill="var(--brand-purple-pastel)" />
    </svg>
  )
}

export function Logo({ className, markClassName, textClassName }: { className?: string; markClassName?: string; textClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("size-6", markClassName)} />
      <span className={cn("font-heading font-semibold tracking-tight text-lg", textClassName)}>
        Events <span className="text-primary">Partner</span>
      </span>
    </span>
  )
}

/** Stacked two-line wordmark for hero/marketing contexts. */
export function LogoStacked({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <span className="font-heading font-semibold tracking-[0.15em] text-sm leading-tight uppercase">Events</span>
      <span className="font-heading font-semibold tracking-[0.15em] text-sm leading-tight uppercase text-primary">Partner</span>
    </span>
  )
}
