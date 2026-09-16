import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Logo, LogoFull } from "@/components/brand/logo"
import { EVENT_TYPE_OPTIONS } from "@/lib/event-types"
import { PLAN_PRICING, formatPHP } from "@/lib/entitlements"
import {
  CalendarDays, Users, LayoutGrid, Sparkles, QrCode, MessageSquareText,
  MapPin, CheckCircle2, ArrowRight,
} from "lucide-react"

const FEATURES = [
  { icon: LayoutGrid, title: "Digital event websites", body: "A shareable page for every event: hero, schedule, gallery, FAQ, maps, and RSVP — built in minutes." },
  { icon: Sparkles, title: "Canva-style invitation editor", body: "Drag, resize, layer, and design your own invitation exactly the way you want it." },
  { icon: Users, title: "Guest & RSVP management", body: "Personalized RSVP links, plus-ones, custom questions, households, and live response analytics." },
  { icon: LayoutGrid, title: "Visual seating & floor plans", body: "Real tables and chairs you drag into place — not a spreadsheet. Auto seat placement included." },
  { icon: MessageSquareText, title: "Email & SMS reminders", body: "Personalized messages with merge fields, scheduled sends, and delivery tracking." },
  { icon: QrCode, title: "QR check-in", body: "Scan guests in on event day and watch attendance update live." },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo responsive />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,var(--brand-lavender),transparent_60%)] opacity-60" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-20 pb-16 text-center space-y-6">
          <LogoFull width={140} className="mx-auto" />
          <Badge variant="outline" className="border-primary/30 text-primary bg-accent/30">For every kind of event — not just weddings</Badge>
          <h1 className="font-heading text-4xl sm:text-6xl font-semibold tracking-tight text-balance">
            Plan, invite, and manage any event — beautifully.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance">
            Events Partner brings invitations, RSVPs, guest lists, seating charts, and event-day check-in into one
            partner that works for birthdays, weddings, conferences, reunions, and everything in between.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" asChild>
              <Link href="/register">
                Create your first event <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#pricing">See pricing</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-20">
          <div className="flex flex-wrap justify-center gap-2">
            {EVENT_TYPE_OPTIONS.map((t) => (
              <span key={t.value} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm shadow-xs">
                <span>{t.emoji}</span> {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6 space-y-3 border-border/70 shadow-xs">
              <div className="size-10 rounded-full bg-accent/40 text-primary flex items-center justify-center">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 grid sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <CalendarDays className="mx-auto size-6 text-primary" />
            <h4 className="font-heading font-semibold">One page per event</h4>
            <p className="text-sm text-muted-foreground">Countdown, schedule, gallery, dress code, gift info — all in your own design.</p>
          </div>
          <div className="space-y-2">
            <MapPin className="mx-auto size-6 text-primary" />
            <h4 className="font-heading font-semibold">Maps &amp; calendars</h4>
            <p className="text-sm text-muted-foreground">Directions and one-tap Google, Apple, and Outlook calendar adds.</p>
          </div>
          <div className="space-y-2">
            <CheckCircle2 className="mx-auto size-6 text-primary" />
            <h4 className="font-heading font-semibold">Event-day check-in</h4>
            <p className="text-sm text-muted-foreground">Search or scan guests in and watch attendance update live.</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="text-center mb-10 space-y-2">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">Simple, one-time pricing</h2>
          <p className="text-muted-foreground">No subscriptions. Pay once per event, or go Unlimited for your whole account.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PricingCard name="Free" price={PLAN_PRICING.FREE.price} note="Per event" features={["Basic invitation", "Basic RSVP", "Up to 30 guests", "Basic seating"]} />
          <PricingCard name="Premium" price={PLAN_PRICING.PREMIUM.price} note="One-time, per event" features={["Premium themes", "Canva-style editor", "Custom RSVP questions", "Advanced seating"]} />
          <PricingCard name="Pro" price={PLAN_PRICING.PRO.price} note="One-time, per event" features={["Everything in Premium", "Unlimited guests", "Coordinator tools", "Co-branding", "Advanced analytics"]} highlight />
          <PricingCard name="Unlimited" price={PLAN_PRICING.UNLIMITED.price} note="One-time, whole account" features={["Everything in Pro", "Unlimited events", "New events auto-unlock"]} />
        </div>
      </section>

      <footer className="border-t border-border/70 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo textClassName="text-base" markClassName="size-5" />
          <span>© {new Date().getFullYear()} Events Partner. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}

function PricingCard({
  name, price, note, features, highlight,
}: { name: string; price: number; note: string; features: string[]; highlight?: boolean }) {
  return (
    <Card className={`p-6 space-y-4 border-border/70 ${highlight ? "border-primary/50 shadow-md bg-accent/10" : "shadow-xs"}`}>
      {highlight && <Badge className="w-fit bg-primary text-primary-foreground">Most popular</Badge>}
      <div>
        <h3 className="font-heading font-semibold text-lg">{name}</h3>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      <div className="font-heading text-3xl font-semibold">{price === 0 ? "₱0" : formatPHP(price)}</div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Button asChild className="w-full" variant={highlight ? "default" : "outline"}>
        <Link href="/register">Get started</Link>
      </Button>
    </Card>
  )
}
