"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  CalendarDays, Clock, MapPin, Users, Mail, ExternalLink, Image as ImageIcon,
  UserRound, Armchair, MessageCircle, Pencil, Ban,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { setEventStatus } from "@/actions/events"
import { getEventTypeConfig } from "@/lib/event-types"
import { PLAN_PRICING } from "@/lib/entitlements"
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_STYLE, getBookingStatus } from "@/lib/booking-calendar"
import type { CalendarEvent } from "./types"

export function EventDetailSheet({ event, open, onOpenChange }: { event: CalendarEvent | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (!event) return null

  const typeConfig = getEventTypeConfig(event.type)
  const bookingStatus = getBookingStatus({ status: event.status, date: event.date ? new Date(event.date) : null })
  const isCancelled = bookingStatus === "CANCELLED"

  function cancelBooking() {
    startTransition(async () => {
      const result = await setEventStatus(event!.id, "ARCHIVED")
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Booking cancelled.")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={BOOKING_STATUS_STYLE[bookingStatus]}>{BOOKING_STATUS_LABEL[bookingStatus]}</Badge>
            <Badge variant="secondary" className="font-normal">{typeConfig.emoji} {event.customTypeLabel || typeConfig.label}</Badge>
          </div>
          <SheetTitle className="font-heading text-2xl">{event.name}</SheetTitle>
          <SheetDescription>Created {format(new Date(event.createdAt), "MMM d, yyyy")}</SheetDescription>
        </SheetHeader>

        <div className="px-4 sm:px-6 space-y-4 pb-4">
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="size-4 text-muted-foreground shrink-0" />
              <span>{event.date ? format(new Date(event.date), "EEEE, MMMM d, yyyy") : "No date set"}</span>
            </div>
            {event.timeLabel && (
              <div className="flex items-center gap-2.5">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                <span>{event.timeLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <MapPin className="size-4 text-muted-foreground shrink-0" />
              <span>{event.venueName || "No venue set"}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="size-4 text-muted-foreground shrink-0" />
              <span>{event.attendingCount} attending · {event.guestCount} invited</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Booker</p>
            <div className="flex items-center gap-2.5 text-sm">
              <UserRound className="size-4 text-muted-foreground shrink-0" />
              <span>{event.ownerName || "You"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{event.ownerEmail}</span>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium">{PLAN_PRICING.UNLIMITED.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment status</p>
              <p className="font-medium">Approved</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Page status</p>
              <p className="font-medium capitalize">{event.status.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Public page</p>
              <p className="font-medium">{event.isPublic ? "Live" : "Not public"}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/events/${event.id}`}><ExternalLink className="size-3.5" /> Open Event</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={event.isPublic ? `/e/${event.slug}` : `/dashboard/events/${event.id}/editor`} target={event.isPublic ? "_blank" : undefined}>
                <ImageIcon className="size-3.5" /> View Invitation
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/events/${event.id}/guests`}><Users className="size-3.5" /> View Guests</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/events/${event.id}/guests`}><UserRound className="size-3.5" /> View RSVP</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/events/${event.id}/seating`}><Armchair className="size-3.5" /> View Seating</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${event.ownerEmail}`}><MessageCircle className="size-3.5" /> Message Booker</a>
            </Button>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/dashboard/events/${event.id}/settings`}><Pencil className="size-3.5" /> Edit Event</Link>
          </Button>
          {!isCancelled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex-1 text-destructive hover:text-destructive">
                  <Ban className="size-3.5" /> Cancel Booking
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{event.name}&rdquo; will be removed from active confirmed bookings. It stays in your booking history and can be reopened later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep booking</AlertDialogCancel>
                  <AlertDialogAction onClick={cancelBooking} disabled={pending} className="bg-destructive text-white hover:bg-destructive/90">
                    {pending ? "Cancelling..." : "Cancel booking"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
