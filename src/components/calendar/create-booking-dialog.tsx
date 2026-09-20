"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { format } from "date-fns"
import { AlertTriangle } from "lucide-react"
import { createEvent, updateEvent } from "@/actions/events"
import { checkBookingConflict, type ConflictInfo } from "@/actions/calendar"
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event"
import { EVENT_TYPE_OPTIONS } from "@/lib/event-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function CreateBookingDialog({ date, onOpenChange }: { date: Date | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            {date ? `Booking for ${format(date, "EEEE, MMMM d, yyyy")}` : "You can fill in the rest of the details later."}
          </DialogDescription>
        </DialogHeader>
        {/* Keyed by date so every opened date starts from a clean form/conflict state. */}
        {date && <BookingForm key={date.toISOString()} date={date} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function BookingForm({ date, onDone }: { date: Date; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState("")
  const [conflict, setConflict] = useState<ConflictInfo>(null)
  const [checkingConflict, setCheckingConflict] = useState(false)
  const router = useRouter()

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { name: "", type: "PARTY", date: format(date, "yyyy-MM-dd"), timeLabel: "", venueName: "" },
  })

  const watchedDate = useWatch({ control: form.control, name: "date" })
  const watchedTime = useWatch({ control: form.control, name: "timeLabel" })

  // Re-check for a schedule conflict (debounced) whenever the date or time changes.
  useEffect(() => {
    if (!watchedDate) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setCheckingConflict(true)
      const result = await checkBookingConflict({ date: watchedDate, timeLabel: watchedTime })
      if (cancelled) return
      setCheckingConflict(false)
      if (result.ok) setConflict(result.data)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [watchedDate, watchedTime])

  async function onSubmit(values: CreateEventInput) {
    setLoading(true)
    const result = await createEvent(values)
    if (!result.ok) {
      setLoading(false)
      toast.error(result.error)
      return
    }
    if (description.trim()) {
      const updated = await updateEvent({
        eventId: result.data.eventId,
        name: values.name,
        type: values.type,
        date: values.date,
        timeLabel: values.timeLabel,
        venueName: values.venueName,
        description: description.trim(),
      })
      if (!updated.ok) toast.error(`Event created, but the description couldn't be saved: ${updated.error}`)
    }
    setLoading(false)
    onDone()
    toast.success("Event created and added to your calendar.")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event name</FormLabel>
              <FormControl><Input placeholder="e.g. Sofia's 7th Birthday" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Choose a type" /></SelectTrigger></FormControl>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timeLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time</FormLabel>
                <FormControl><Input placeholder="e.g. 2:00 PM" {...field} /></FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="venueName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue (optional)</FormLabel>
              <FormControl><Input placeholder="e.g. Garden Pavilion" {...field} /></FormControl>
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <FormLabel>Description (optional)</FormLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any notes about this event..." rows={3} maxLength={4000} />
        </div>

        {conflict && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Schedule conflict</AlertTitle>
            <AlertDescription>
              Another confirmed event is already scheduled during this time: <strong>{conflict.name}</strong>
              {conflict.timeLabel ? ` at ${conflict.timeLabel}` : ""}{conflict.venueName ? ` (${conflict.venueName})` : ""}.
              You can still create this event, but review the existing booking first.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : checkingConflict ? "Checking schedule..." : conflict ? "Create anyway" : "Save Event"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
