"use client"

import { Mail, Phone, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AddFacebookButton, FacebookProfileLink, MessageOnFacebookButton } from "@/components/guests/facebook-contact"

export type GuestDetails = {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  facebookProfileUrl: string | null
  category: string | null
  rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"
  checkedIn: boolean
  chair: { seatNumber: number; table: { name: string } } | null
}

const STATUS_LABEL: Record<GuestDetails["rsvpStatus"], string> = { PENDING: "Pending", ATTENDING: "Attending", DECLINED: "Declined", MAYBE: "Maybe" }

/** Read-only guest summary with the contact options. Editing still happens in the guest form. */
export function GuestDetailsSheet({
  guest, open, onOpenChange, onEdit, onAddFacebook,
}: {
  guest: GuestDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onAddFacebook: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {guest && (
          <>
            <SheetHeader>
              <SheetTitle className="font-heading text-xl">{guest.firstName} {guest.lastName}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>RSVP:</span> <Badge variant="secondary">{STATUS_LABEL[guest.rsvpStatus]}</Badge>
                  {guest.category && <Badge variant="outline">{guest.category}</Badge>}
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              <section className="space-y-3" aria-labelledby="guest-contact-heading">
                <h3 id="guest-contact-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contact</h3>
                <dl className="divide-y rounded-xl border bg-card">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4" aria-hidden /> Email</dt>
                    <dd className="min-w-0 truncate text-sm">
                      {guest.email ? <a href={`mailto:${guest.email}`} className="hover:underline">{guest.email}</a> : <span className="text-muted-foreground">—</span>}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" aria-hidden /> Phone</dt>
                    <dd className="text-sm">
                      {guest.phone ? <a href={`tel:${guest.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{guest.phone}</a> : <span className="text-muted-foreground">—</span>}
                    </dd>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-sm text-muted-foreground">Facebook</dt>
                      <dd>{guest.facebookProfileUrl ? <FacebookProfileLink url={guest.facebookProfileUrl} /> : <span className="text-sm text-muted-foreground">No Facebook profile added</span>}</dd>
                    </div>
                    {guest.facebookProfileUrl
                      ? <MessageOnFacebookButton url={guest.facebookProfileUrl} className="w-full" />
                      : <AddFacebookButton onClick={onAddFacebook} className="w-full border border-dashed" />}
                  </div>
                </dl>
                {guest.facebookProfileUrl && (
                  <p className="text-xs text-muted-foreground">Opens Facebook so you can message {guest.firstName} yourself. Events Partner doesn&apos;t send Facebook messages.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Event day</h3>
                <p className="text-sm">Seat: {guest.chair ? `${guest.chair.table.name} · #${guest.chair.seatNumber}` : "Not assigned"}</p>
                <p className="text-sm">Check-in: {guest.checkedIn ? "Checked in" : "Not yet"}</p>
              </section>

              <Button variant="outline" className="w-full" onClick={onEdit}><Pencil className="size-4" /> Edit guest</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
