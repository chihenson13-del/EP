"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu({ user }: { user: { name: string; email: string; image: string | null; role?: string } }) {
  const initials = (user.name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="h-9 w-9 border">
          <AvatarImage src={user.image ?? undefined} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-medium truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground font-normal truncate">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">My Events</Link>
        </DropdownMenuItem>
        {/* The top navigation is hidden on small screens, so these must be reachable from the menu. */}
        <DropdownMenuItem asChild className="md:hidden">
          <Link href="/dashboard/calendar">Booking Calendar</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/purchases">Purchases</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">Account settings</Link>
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
          <DropdownMenuItem asChild className="md:hidden">
            <Link href="/admin">Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
