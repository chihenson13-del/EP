import { requireAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { PaymentsQueue } from "@/components/admin/payments-queue"

export default async function AdminPaymentsPage() {
  await requireAdmin()
  // Proof images are stored as multi-megabyte data URLs, so they are left out of the query and served from
  // /api/media/proof/[id] (cached, admin/owner only). The user select deliberately excludes passwordHash.
  const [purchases, withProof, users, events] = await Promise.all([
    db.purchase.findMany({
      relationLoadStrategy: "join",
      omit: { proofImageUrl: true },
      include: { user: { select: { name: true, email: true } }, plan: { select: { name: true, key: true } }, event: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.$queryRaw<{ id: string }[]>`SELECT id FROM "Purchase" WHERE "proofImageUrl" IS NOT NULL AND "proofImageUrl" <> ''`,
    db.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    db.event.findMany({ select: { id: true, name: true, ownerId: true }, orderBy: { name: "asc" } }),
  ])
  const proofIds = new Set(withProof.map((p) => p.id))
  const rows = purchases.map((p) => ({ ...p, proofImageUrl: proofIds.has(p.id) ? `/api/media/proof/${p.id}` : null }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Review, approve, or reject submitted payments.</p>
      </div>
      <PaymentsQueue purchases={JSON.parse(JSON.stringify(rows))} users={users} events={events} />
    </div>
  )
}
