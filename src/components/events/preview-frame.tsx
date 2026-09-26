"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, Monitor, Pencil, RefreshCw, Smartphone, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PublishToggle } from "@/components/events/publish-toggle"
import { DeviceFrame, PhoneWidthPicker } from "@/components/events/device-preview"
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
  const [phoneWidth, setPhoneWidth] = useState<number>(DEVICES.mobile.width)
  const [nonce, setNonce] = useState(0)
  const live = status === "PUBLISHED" && isPublic

  const width = device === "mobile" ? phoneWidth : DEVICES[device].width

  function reload() {
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

      {device === "mobile" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Phone width:</span>
          <PhoneWidthPicker value={phoneWidth} onChange={setPhoneWidth} />
        </div>
      )}

      <div className="rounded-2xl border bg-secondary/40 p-3 sm:p-6 flex justify-center">
        <DeviceFrame key={`${device}-${width}-${nonce}`} src={`/preview/${eventId}?r=${nonce}`} width={width} kind={device === "mobile" ? "phone" : device === "tablet" ? "tablet" : "desktop"} />
      </div>
    </div>
  )
}
