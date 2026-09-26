import { ComingSoonBadge } from "@/components/addons/sms-coming-soon"
import { ADDONS } from "@/lib/addons"

/**
 * "Optional add-ons" block shown below the plan cards. Add-ons are sold separately from every plan, so nothing
 * here is presented as included in Free, Premium, Pro or Unlimited, and no price is shown until one is set.
 */
export function OptionalAddOns({ className = "" }: { className?: string }) {
  return (
    <section className={`space-y-4 ${className}`} aria-labelledby="optional-addons-heading">
      <div className="text-center space-y-1">
        <h3 id="optional-addons-heading" className="font-heading text-xs font-semibold uppercase tracking-[0.22em] text-primary">Optional add-ons</h3>
        <p className="text-sm text-muted-foreground">Sold separately — not included in any plan.</p>
      </div>
      <div className="mx-auto grid max-w-md gap-4">
        {ADDONS.map((addon) => (
          <div
            key={addon.key}
            className="rounded-2xl border p-5 text-center space-y-2"
            style={{ borderColor: "var(--brand-beige)", background: "linear-gradient(160deg, var(--brand-ivory), var(--brand-cream))" }}
          >
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand-plum)" }}>{addon.name}</p>
            {addon.status === "COMING_SOON" && <div><ComingSoonBadge /></div>}
            <p className="text-sm text-muted-foreground">Available as an optional paid add-on. {addon.costNote}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
