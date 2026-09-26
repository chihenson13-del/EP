"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LinkPending } from "@/components/shared/link-pending"
import {
  LayoutDashboard, Globe, Palette, Wand2, Users, ListChecks, Armchair, ChevronDown,
  MessageSquareText, CalendarClock, Images, ScanLine, BarChart3, Settings, Crown, UserCog, Eye, ClipboardCheck,
} from "lucide-react"
import type { CollaboratorRole } from "@prisma/client"

const NAV = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/website", label: "Website", icon: Globe },
  { href: "/preview", label: "Preview", icon: Eye },
  { href: "/theme", label: "Theme", icon: Palette },
  { href: "/editor", label: "Invitation Editor", icon: Wand2 },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/rsvps", label: "RSVP Responses", icon: ClipboardCheck },
  { href: "/rsvp-questions", label: "RSVP Setup", icon: ListChecks },
  { href: "/seating", label: "Seating", icon: Armchair },
  { href: "/messaging", label: "Messaging", icon: MessageSquareText },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/checkin", label: "Check-in", icon: ScanLine },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/upgrade", label: "Upgrade", icon: Crown },
] as const

/**
 * Event section navigation. Desktop: a vertical list. Phones and tablets (incl. iPad): a "current section" button
 * that opens a grid of every section — it fits the screen, so nothing has to be scrolled sideways.
 */
export function EventSidebarNav({ eventId, role }: { eventId: string; role: CollaboratorRole }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const base = `/dashboard/events/${eventId}`
  const items = NAV.filter((item) => !((item.href === "/upgrade" || item.href === "/team") && role !== "OWNER"))
  // The current section: the longest matching path (so /guests/import still highlights Guests).
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => pathname === `${base}${item.href}` || (item.href && pathname.startsWith(`${base}${item.href}/`))) ?? items[0]
  const CurrentIcon = current.icon

  const link = (item: (typeof items)[number], compact: boolean) => {
    const href = `${base}${item.href}`
    const active = item === current
    return (
      <Link
        key={item.href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
          compact ? "min-h-11 py-2" : "py-2",
          active ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground/80",
        )}
      >
        <item.icon className="size-4 shrink-0" />
        <span className={compact ? "min-w-0 leading-tight" : "truncate"}>{item.label}</span>
        <LinkPending className="ml-auto" />
      </Link>
    )
  }

  return (
    <nav aria-label="Event sections">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full min-h-11 items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-sm font-medium cursor-pointer"
        >
          <CurrentIcon className="size-4 shrink-0 text-primary" />
          <span className="flex-1 min-w-0 truncate text-left">{current.label}</span>
          <span className="text-xs text-muted-foreground">{open ? "Close" : "All sections"}</span>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border bg-card p-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => link(item, true))}
          </div>
        )}
      </div>
      <div className="hidden lg:block rounded-xl border bg-card p-2 space-y-0.5">
        {items.map((item) => link(item, false))}
      </div>
    </nav>
  )
}
