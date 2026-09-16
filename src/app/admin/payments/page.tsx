import { db } from "@/lib/db"
import { PaymentsQueue } from "@/components/admin/payments-queue"

export default async function AdminPaymentsPage() {
  const purchases = await db.purchase.findMany({
    include: { user: true, plan: true, event: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const users = await db.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } })
  const events = await db.event.findMany({ select: { id: true, name: true, ownerId: true }, orderBy: { name: "asc" } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Review, approve, or reject submitted payments.</p>
      </div>
      <PaymentsQueue purchases={JSON.parse(JSON.stringify(purchases))} users={users} events={events} />
    </div>
  )
}
