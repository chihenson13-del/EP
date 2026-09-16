import Link from "next/link"
import { db } from "@/lib/db"
import { formatPHP } from "@/lib/entitlements"
import { Card, CardContent } from "@/components/ui/card"
import { Users, CalendarDays, CreditCard, TrendingUp } from "lucide-react"

export default async function AdminOverviewPage() {
  const [userCount, eventCount, pendingCount, approvedPurchases, recentPending] = await Promise.all([
    db.user.count(),
    db.event.count(),
    db.purchase.count({ where: { status: { in: ["PENDING", "SUBMITTED", "UNDER_REVIEW"] } } }),
    db.purchase.findMany({ where: { status: "APPROVED" }, select: { amount: true } }),
    db.purchase.findMany({
      where: { status: { in: ["PENDING", "SUBMITTED", "UNDER_REVIEW"] } },
      include: { user: true, plan: true, event: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  const revenue = approvedPurchases.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Platform Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Users" value={userCount} />
        <StatCard icon={CalendarDays} label="Events" value={eventCount} />
        <StatCard icon={CreditCard} label="Pending payments" value={pendingCount} tone={pendingCount > 0 ? "text-amber-600" : undefined} />
        <StatCard icon={TrendingUp} label="Approved revenue" value={formatPHP(revenue)} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Payments awaiting review</h2>
            <Link href="/admin/payments" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          {recentPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing pending. 🎉</p>
          ) : (
            <ul className="divide-y">
              {recentPending.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <span>{p.user.name} — {p.plan.name}{p.event ? ` (${p.event.name})` : ""}</span>
                  <span className="text-muted-foreground">{formatPHP(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string | number; tone?: string }) {
  return (
    <Card className="p-4">
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${tone ?? ""}`}>
        <Icon className="size-4" /> {label}
      </div>
      <div className="font-heading text-2xl font-bold mt-1">{value}</div>
    </Card>
  )
}
