"use client"

import { formatDate } from "@/lib/timezone"
import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MoreVertical, Users, CalendarDays, MapPin } from "lucide-react"
import type { EventStatus, EventType, PlanKey } from "@prisma/client"
import { getEventTypeConfig } from "@/lib/event-types"
import { deleteEvent, duplicateEvent, setEventStatus } from "@/actions/events"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { safe } from "@/lib/safe-action"
export type EventCardData = {
  id: string
  name: string
  slug: string
  type: EventType
  status: EventStatus
  date: Date | null
  venueName: string | null
  role: "OWNER" | "COORDINATOR" | "CLIENT" | "VIEWER"
  planKey: PlanKey
  attendingCount: number
  _count: { guests: number }
}

const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  ARCHIVED: "Archived",
}

const STATUS_VARIANT: Record<EventStatus, "secondary" | "default" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  UNPUBLISHED: "outline",
  ARCHIVED: "outline",
}

const PLAN_BADGE: Record<PlanKey, string> = {
  FREE: "Free",
  PREMIUM: "Premium",
  PRO: "Pro",
  UNLIMITED: "Unlimited",
}

export function EventCard({ event }: { event: EventCardData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const typeConfig = getEventTypeConfig(event.type)

  function handleDuplicate() {
    startTransition(async () => {
      const result = await safe(duplicateEvent(event.id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Event duplicated.")
      router.push(`/dashboard/events/${result.data.eventId}`)
    })
  }

  function handlePublishToggle() {
    startTransition(async () => {
      const next = event.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED"
      const result = await safe(setEventStatus(event.id, next))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next === "PUBLISHED" ? "Event published." : "Event unpublished.")
      router.refresh()
    })
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      const next = event.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED"
      const result = await safe(setEventStatus(event.id, next))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next === "ARCHIVED" ? "Event archived." : "Event restored.")
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await safe(deleteEvent(event.id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Event deleted.")
      setConfirmDelete(false)
      router.refresh()
    })
  }

  return (
    <>
      <Card className="p-4 gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/events/${event.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{typeConfig.emoji}</span>
              <span>{typeConfig.label}</span>
            </div>
            <h3 className="font-heading font-semibold truncate">{event.name}</h3>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={pending}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/events/${event.id}`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>Duplicate</DropdownMenuItem>
              {event.role === "OWNER" && (
                <>
                  <DropdownMenuItem onClick={handlePublishToggle}>
                    {event.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleArchiveToggle}>
                    {event.status === "ARCHIVED" ? "Restore" : "Archive"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {event.date && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {formatDate(event.date, { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
          {event.venueName && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.venueName}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {event.attendingCount} attending · {event._count.guests} guests
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Badge variant={STATUS_VARIANT[event.status]}>{STATUS_LABEL[event.status]}</Badge>
          <Badge variant="outline" className={event.planKey !== "FREE" ? "border-primary text-primary" : ""}>
            {PLAN_BADGE[event.planKey]}
          </Badge>
          {event.role !== "OWNER" && <Badge variant="outline">{event.role}</Badge>}
        </div>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{event.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the event, its guest list, RSVPs, invitation design, and seating plan. Your purchase history is preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending} className="bg-destructive text-white hover:bg-destructive/90">
              Delete event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
