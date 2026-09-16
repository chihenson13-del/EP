"use client"

import { useRouter } from "next/navigation"
import { getEventTypeConfig } from "@/lib/event-types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EventStatus, EventType } from "@prisma/client"

type MiniEvent = { id: string; name: string; type: EventType; status: EventStatus }

export function EventSwitcher({ events, currentId }: { events: MiniEvent[]; currentId: string }) {
  const router = useRouter()

  return (
    <Select value={currentId} onValueChange={(id) => router.push(`/dashboard/events/${id}`)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {events.map((e) => {
          const config = getEventTypeConfig(e.type)
          return (
            <SelectItem key={e.id} value={e.id}>
              {config.emoji} {e.name}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
