"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { guestSchema, type GuestInput } from "@/lib/validations/guest"
import { upsertGuest } from "@/actions/guests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type GuestLike = {
  id?: string
  firstName?: string
  lastName?: string | null
  email?: string | null
  phone?: string | null
  category?: string | null
  facebookProfileUrl?: string | null
  groupId?: string | null
  plusOneAllowed?: boolean
  maxPlusOnes?: number
  childrenCount?: number
  mealPreference?: string | null
  dietaryRestrictions?: string | null
  notes?: string | null
}

export function GuestFormDialog({
  eventId, open, onOpenChange, guest, focusField,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  guest: GuestLike | null
  /** Field to focus when the dialog opens, e.g. from an "Add Facebook" button. */
  focusField?: "facebookProfileUrl"
}) {
  const [loading, setLoading] = useState(false)

  const form = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: emptyValues(),
  })

  const plusOneAllowed = useWatch({ control: form.control, name: "plusOneAllowed" })

  useEffect(() => {
    if (!open) return
    form.reset(guest ? toFormValues(guest) : emptyValues())
    if (focusField) {
      // Wait for the dialog's own open-focus to finish, then move focus to the requested field.
      const timer = window.setTimeout(() => form.setFocus(focusField, { shouldSelect: false }), 60)
      return () => window.clearTimeout(timer)
    }
  }, [open, guest, form, focusField])

  const once = useSingleFlight()
  function onSubmit(values: GuestInput) {
    return once(async () => {
    setLoading(true)
    const result = await safe(upsertGuest(eventId, values))
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(guest?.id ? "Guest updated." : "Guest added.")
    onOpenChange(false)
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guest?.id ? "Edit guest" : "Add guest"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("id")} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem><FormLabel>First name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem><FormLabel>Last name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="facebookProfileUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook Profile</FormLabel>
                <FormControl>
                  <Input type="text" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="https://facebook.com/username" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional. Add the guest&apos;s Facebook profile link to quickly contact them.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Category / group</FormLabel><FormControl><Input placeholder="e.g. Family, Friends, VIP" {...field} /></FormControl></FormItem>
            )} />

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Allow plus-ones</p>
                <p className="text-xs text-muted-foreground">Let this guest bring additional people.</p>
              </div>
              <FormField control={form.control} name="plusOneAllowed" render={({ field }) => (
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            {plusOneAllowed && (
              <FormField control={form.control} name="maxPlusOnes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max plus-ones</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="mealPreference" render={({ field }) => (
                <FormItem><FormLabel>Meal preference</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="dietaryRestrictions" render={({ field }) => (
                <FormItem><FormLabel>Dietary restrictions</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : guest?.id ? "Save changes" : "Add guest"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function emptyValues(): GuestInput {
  return {
    firstName: "", lastName: "", email: "", phone: "", category: "", facebookProfileUrl: "", groupId: "",
    plusOneAllowed: false, maxPlusOnes: 0, childrenCount: 0, mealPreference: "", dietaryRestrictions: "", notes: "",
  }
}

function toFormValues(guest: GuestLike): GuestInput {
  return {
    id: guest.id,
    firstName: guest.firstName ?? "",
    lastName: guest.lastName ?? "",
    email: guest.email ?? "",
    phone: guest.phone ?? "",
    category: guest.category ?? "",
    facebookProfileUrl: guest.facebookProfileUrl ?? "",
    groupId: guest.groupId ?? "",
    plusOneAllowed: guest.plusOneAllowed ?? false,
    maxPlusOnes: guest.maxPlusOnes ?? 0,
    childrenCount: guest.childrenCount ?? 0,
    mealPreference: guest.mealPreference ?? "",
    dietaryRestrictions: guest.dietaryRestrictions ?? "",
    notes: guest.notes ?? "",
  }
}
