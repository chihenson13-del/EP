"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"
import { PLAN_RANK } from "@/lib/entitlements"
import { sendEmail } from "@/lib/mailer"
import { paymentStatusTemplate } from "@/lib/email-templates"
import { grantEntitlementSchema, type GrantEntitlementInput } from "@/lib/validations/payment"
import type { ActionResult } from "@/actions/events"
import type { Prisma } from "@prisma/client"

async function logActivity(actorId: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
  await db.activityLog.create({ data: { actorId, action, targetType, targetId, metadata: metadata as Prisma.InputJsonValue | undefined } })
}

export async function approvePurchase(purchaseId: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const purchase = await db.purchase.findUnique({ relationLoadStrategy: "join", where: { id: purchaseId }, include: { plan: true, user: true } })
  if (!purchase) return { ok: false, error: "Purchase not found." }
  if (purchase.status === "APPROVED") return { ok: false, error: "Already approved." }
  if (purchase.plan.scope === "EVENT" && !purchase.eventId) {
    return { ok: false, error: "This purchase's event no longer exists, so it can't be approved. Reject it or grant access manually." }
  }

  const approved = await db.$transaction(async (tx) => {
    // Atomic status flip: if two admins click at once only one wins, so entitlements can't be doubled.
    const flipped = await tx.purchase.updateMany({
      where: { id: purchaseId, status: { not: "APPROVED" } },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: admin.id, rejectedReason: null },
    })
    if (flipped.count === 0) return false

    const existing = await tx.entitlement.findFirst({
      where: { userId: purchase.userId, eventId: purchase.eventId, scope: purchase.plan.scope, status: "ACTIVE" },
      include: { plan: true },
    })
    if (existing) {
      // Never downgrade: approving an older/cheaper purchase must not replace a higher active plan.
      if (PLAN_RANK[existing.plan.key] <= PLAN_RANK[purchase.plan.key]) {
        await tx.entitlement.update({ where: { id: existing.id }, data: { planId: purchase.planId, purchaseId: purchase.id, activatedAt: new Date() } })
      }
    } else {
      await tx.entitlement.create({
        data: {
          userId: purchase.userId,
          eventId: purchase.eventId,
          planId: purchase.planId,
          scope: purchase.plan.scope,
          purchaseId: purchase.id,
        },
      })
    }
    return true
  })
  if (!approved) return { ok: false, error: "Already approved." }

  await logActivity(admin.id, "PURCHASE_APPROVED", "Purchase", purchaseId, { amount: purchase.amount, plan: purchase.plan.key })
  await sendEmail({
    to: purchase.user.email,
    subject: `Your ${purchase.plan.name} access is active`,
    html: paymentStatusTemplate(purchase.user.name ?? "there", "APPROVED", purchase.plan.name),
  })

  revalidatePath("/admin/payments")
  revalidatePath("/dashboard")
  return { ok: true, data: undefined }
}

export async function rejectPurchase(purchaseId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const purchase = await db.purchase.findUnique({ relationLoadStrategy: "join", where: { id: purchaseId }, include: { plan: true, user: true } })
  if (!purchase) return { ok: false, error: "Purchase not found." }

  await db.purchase.update({ where: { id: purchaseId }, data: { status: "REJECTED", rejectedReason: reason } })
  await logActivity(admin.id, "PURCHASE_REJECTED", "Purchase", purchaseId, { reason })
  await sendEmail({
    to: purchase.user.email,
    subject: "Update on your Events Partner payment",
    html: paymentStatusTemplate(purchase.user.name ?? "there", "REJECTED", purchase.plan.name),
  })

  revalidatePath("/admin/payments")
  return { ok: true, data: undefined }
}

export async function grantEntitlementManually(input: GrantEntitlementInput): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = grantEntitlementSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const d = parsed.data

  const plan = await db.plan.findUniqueOrThrow({ where: { key: d.planKey } })
  if (plan.scope === "EVENT" && !d.eventId) return { ok: false, error: "Select an event for this plan." }

  await db.entitlement.create({
    data: {
      userId: d.userId,
      eventId: plan.scope === "EVENT" ? d.eventId : null,
      planId: plan.id,
      scope: plan.scope,
      grantedManually: true,
      grantReason: d.reason,
      grantedById: admin.id,
    },
  })

  await logActivity(admin.id, "ENTITLEMENT_GRANTED", "User", d.userId, { plan: plan.key, eventId: d.eventId, reason: d.reason })

  revalidatePath("/admin")
  revalidatePath("/dashboard")
  return { ok: true, data: undefined }
}

export async function revokeEntitlement(entitlementId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const existing = await db.entitlement.findUnique({ where: { id: entitlementId }, select: { id: true } })
  if (!existing) return { ok: false, error: "Entitlement not found." }
  await db.entitlement.update({ where: { id: entitlementId }, data: { status: "REVOKED", revokedAt: new Date() } })
  await logActivity(admin.id, "ENTITLEMENT_REVOKED", "Entitlement", entitlementId, { reason })
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  return { ok: true, data: undefined }
}

export async function simulateTestPayment(userId: string, planKey: "PREMIUM" | "PRO" | "UNLIMITED", eventId: string | undefined, outcome: "PENDING" | "APPROVED" | "REJECTED" | "FAILED"): Promise<ActionResult> {
  const admin = await requireAdmin()
  // Fake payments would count as real approved revenue and grant real entitlements, so this
  // development-only tool is refused outright in production. Use "Manual grant" (with a reason) instead.
  if (process.env.NODE_ENV === "production") return { ok: false, error: "Test payments are disabled in production." }
  const plan = await db.plan.findUniqueOrThrow({ where: { key: planKey } })

  const purchase = await db.purchase.create({
    data: {
      userId,
      eventId: plan.scope === "EVENT" ? eventId : null,
      planId: plan.id,
      amount: plan.price,
      paymentReference: `TEST-${Date.now()}`,
      paymentMethod: "Test Mode",
      status: outcome === "PENDING" ? "SUBMITTED" : outcome,
      approvedAt: outcome === "APPROVED" ? new Date() : null,
      approvedById: outcome === "APPROVED" ? admin.id : null,
    },
  })

  if (outcome === "APPROVED") {
    await db.entitlement.create({
      data: { userId, eventId: plan.scope === "EVENT" ? eventId : null, planId: plan.id, scope: plan.scope, purchaseId: purchase.id },
    })
  }

  await logActivity(admin.id, "TEST_PAYMENT_SIMULATED", "Purchase", purchase.id, { planKey, outcome })
  revalidatePath("/admin/payments")
  return { ok: true, data: undefined }
}
