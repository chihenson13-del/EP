import Image from "next/image"
import { cn } from "@/lib/utils"
import monogram from "../../../public/branding/logo-monogram.png"
import fullLogo from "../../../public/branding/logo-full.png"

/**
 * Official Events Partner brand mark — the EP monogram cropped from the approved
 * logo artwork (public/branding/logo-monogram.png). Never redraw or recolor this;
 * if a different crop or size is needed, re-crop from public/branding/logo-full.png.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={monogram}
      alt=""
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  )
}

/**
 * Compact horizontal lockup: monogram + wordmark, for nav bars and headers.
 * Pass `responsive` in space-constrained top bars to drop to monogram-only below `sm`.
 */
export function Logo({
  className, markClassName, textClassName, responsive = false,
}: {
  className?: string
  markClassName?: string
  textClassName?: string
  responsive?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("size-8", markClassName)} />
      <span className={cn("font-heading font-semibold tracking-tight text-lg", responsive && "hidden sm:inline-block", textClassName)}>
        Events <span className="text-primary">Partner</span>
      </span>
    </span>
  )
}

/** Full official logo artwork (monogram + wordmark + tagline) for prominent, larger placements. */
export function LogoFull({ className, width = 220 }: { className?: string; width?: number }) {
  return (
    <Image
      src={fullLogo}
      alt="Events Partner — Plan · Invite · Celebrate"
      width={width}
      height={width}
      className={cn("h-auto", className)}
      style={{ width, height: "auto" }}
      priority
    />
  )
}

/** Stacked two-line wordmark for compact marketing contexts where the full artwork doesn't fit. */
export function LogoStacked({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <span className="font-heading font-semibold tracking-[0.15em] text-sm leading-tight uppercase">Events</span>
      <span className="font-heading font-semibold tracking-[0.15em] text-sm leading-tight uppercase text-primary">Partner</span>
    </span>
  )
}
