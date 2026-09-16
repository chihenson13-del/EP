"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Globe, Palette, Wand2, Users, ListChecks, Armchair,
  MessageSquareText, CalendarClock, Images, ScanLine, BarChart3, Settings, Crown, UserCog,
} from "lucide-react"
import type { CollaboratorRole } from "@prisma/client"

const NAV = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/website", label: "Website", icon: Globe },
  { href: "/theme", label: "Theme", icon: Palette },
  { href: "/editor", label: "Invitation Editor", icon: Wand2 },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/rsvp-questions", label: "RSVP Questions", icon: ListChecks },
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

export function EventSidebarNav({ eventId, role }: { eventId: string; role: CollaboratorRole }) {
  const pathname = usePathname()
  const base = `/dashboard/events/${eventId}`

  return (
    <nav className="rounded-xl border bg-card p-2 space-y-0.5">
      {NAV.map((item) => {
        const href = `${base}${item.href}`
        const active = pathname === href
        if ((item.href === "/upgrade" || item.href === "/team") && role !== "OWNER") return null
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground/80"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
