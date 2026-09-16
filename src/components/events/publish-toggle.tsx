"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setEventStatus } from "@/actions/events"
import { Button } from "@/components/ui/button"
import type { EventStatus } from "@prisma/client"

export function PublishToggle({ eventId, status }: { eventId: string; status: EventStatus }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const published = status === "PUBLISHED"

  function toggle() {
    startTransition(async () => {
      const result = await setEventStatus(eventId, published ? "UNPUBLISHED" : "PUBLISHED")
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(published ? "Event unpublished." : "Event published! Your public page is now live.")
      router.refresh()
    })
  }

  return (
    <Button onClick={toggle} disabled={pending} variant={published ? "outline" : "default"}>
      {published ? "Unpublish" : "Publish event"}
    </Button>
  )
}
