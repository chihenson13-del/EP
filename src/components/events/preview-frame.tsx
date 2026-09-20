"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, Monitor, Pencil, RefreshCw, Smartphone, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PublishToggle } from "@/components/events/publish-toggle"
import { cn } from "@/lib/utils"
import type { EventStatus } from "@prisma/client"

const DEVICES = {
  mobile: { label: "Mobile", width: 390, icon: Smartphone },
  tablet: { label: "Tablet", width: 768, icon: Tablet },
  desktop: { label: "Desktop", width: null, icon: Monitor },
} as const

type Device = keyof typeof DEVICES

/**
 * The toolbar renders immediately; the invitation itself loads inside the frame afterwards, with its own
 * loading state. The frame shows the event's real saved data — nothing here is mocked.
 */
export function PreviewFrame({
  eventId, slug, status, isPublic, canPublish,
}: { eventId: string; slug: string; status: EventStatus; isPublic: boolean; canPublish: boolean }) {
  const [device, setDevice] = useState<Device>("mobile")
  const [nonce, setNonce] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const live = status === "PUBLISHED" && isPublic

  const width = DEVICES[device].width

  function reload() {
    setLoaded(false)
    setNonce((n) => n + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <div className="flex items-center gap-1" role="group" aria-label="Preview size">
          {(Object.keys(DEVICES) as Device[]).map((key) => {
            const Icon = DEVICES[key].icon
            return (
              <Button key={key} size="sm" variant={device === key ? "secondary" : "ghost"} onClick={() => setDevice(key)} aria-pressed={device === key}>
                <Icon className="size-4" /> <span className="hidden sm:inline">{DEVICES[key].label}</span>
              </Button>
            )
          })}
        </div>
        <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="size-4" /> <span className="hidden sm:inline">Refresh</span></Button>
        <div className="flex-1" />
        <Badge variant={live ? "default" : "secondary"}>{live ? "Published" : status === "ARCHIVED" ? "Archived" : "Draft — only you can see this"}</Badge>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/dashboard/events/${eventId}/editor`}><Pencil className="size-4" /> Edit design</Link>
        </Button>
        {live && (
          <Button size="sm" variant="outline" asChild>
            <a href={`/e/${slug}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Open published page</a>
          </Button>
        )}
        {canPublish && status !== "ARCHIVED" && <PublishToggle eventId={eventId} status={status} />}
      </div>

      <div className="rounded-2xl border bg-secondary/40 p-3 sm:p-6 flex justify-center overflow-x-auto">
        <div
          className={cn("relative bg-white shadow-lg overflow-hidden transition-[width] duration-200", width ? "rounded-[2rem] border-8 border-foreground/80" : "rounded-xl w-full")}
          style={width ? { width, maxWidth: "100%" } : undefined}
        >
          {!loaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-sm text-muted-foreground" role="status">
              Loading your invitation…
            </div>
          )}
          <iframe
            key={`${device}-${nonce}`}
            title="Invitation preview"
            src={`/preview/${eventId}?r=${nonce}`}
            onLoad={() => setLoaded(true)}
            className="block w-full bg-white"
            style={{ height: "min(78vh, 900px)", border: 0 }}
          />
        </div>
      </div>
    </div>
  )
}
