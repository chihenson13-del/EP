"use client"

import Link from "next/link"
import { Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ExportButtons({ eventId }: { eventId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"><Download className="size-4" /> Export</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>CSV</DropdownMenuLabel>
        <DropdownMenuItem asChild><a href={`/api/events/${eventId}/export?type=guests`}>Guest list CSV</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={`/api/events/${eventId}/export?type=rsvp`}>RSVP report CSV</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={`/api/events/${eventId}/export?type=seating`}>Seating report CSV</a></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Print</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link href={`/print/${eventId}/guests`} target="_blank"><Printer className="size-3.5" /> Printable guest list</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={`/print/${eventId}/seating`} target="_blank"><Printer className="size-3.5" /> Printable seating</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
