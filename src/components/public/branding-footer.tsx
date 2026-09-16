import Link from "next/link"
import { LogoMark } from "@/components/brand/logo"

/** Shown on published event pages for Free-plan events (Premium+ removes this via FEATURES.REMOVE_BRANDING). */
export function BrandingFooter() {
  return (
    <div className="py-6 flex items-center justify-center border-t border-black/5">
      <Link href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity">
        <LogoMark className="size-4" />
        Made with Events Partner
      </Link>
    </div>
  )
}
