"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventCard, type EventCardData } from "@/components/events/event-card"
import { CreateEventDialog } from "@/components/events/create-event-dialog"

export function EventsBoard({ events }: { events: EventCardData[] }) {
  const [tab, setTab] = useState("active")

  const filtered = events.filter((e) => {
    if (tab === "active") return e.status !== "ARCHIVED"
    if (tab === "draft") return e.status === "DRAFT"
    if (tab === "published") return e.status === "PUBLISHED"
    if (tab === "archived") return e.status === "ARCHIVED"
    return true
  })

  const counts = {
    active: events.filter((e) => e.status !== "ARCHIVED").length,
    draft: events.filter((e) => e.status === "DRAFT").length,
    published: events.filter((e) => e.status === "PUBLISHED").length,
    archived: events.filter((e) => e.status === "ARCHIVED").length,
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">All ({counts.active})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
          <TabsTrigger value="published">Published ({counts.published})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({counts.archived})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center space-y-3">
          <p className="text-muted-foreground">No events here yet.</p>
          <CreateEventDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
