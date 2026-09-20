"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { getEffectivePlan, hasUnlimitedAccount, PLAN_RANK } from "@/lib/entitlements"
import { submitPurchaseSchema, type SubmitPurchaseInput } from "@/lib/validations/payment"
import { sendEmail } from "@/lib/mailer"
import { paymentStatusTemplate } from "@/lib/email-templates"
import type { ActionResult } from "@/actions/events"

export async function submitPurchase(input: SubmitPurchaseInput): Promise<ActionResult<{ purchaseId: string }>> {
  const user = await requireUser()
  const parsed = submitPurchaseSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const d = parsed.data

  const unlimited = await hasUnlimitedAccount(user.id)
  if (unlimited) return { ok: false, error: "Your account already has Unlimited Access — no need to purchase." }

  if (d.planKey !== "UNLIMITED") {
    if (!d.eventId) return { ok: false, error: "Select an event for this plan." }
    const hasAccess = await requireEventAccess(user.id, d.eventId).then(() => true).catch(() => false)
    if (!hasAccess) return { ok: false, error: "You do not have access to this event." }

    const currentPlan = await getEffectivePlan(user.id, d.eventId)
    if (PLAN_RANK[currentPlan] >= PLAN_RANK[d.planKey]) {
      return { ok: false, error: `This event already has ${currentPlan} access, which covers ${d.planKey}.` }
    }

    const pendingExisting = await db.purchase.findFirst({
      where: { userId: user.id, eventId: d.eventId, status: { in: ["PENDING", "SUBMITTED", "UNDER_REVIEW"] } },
    })
    if (pendingExisting) return { ok: false, error: "You already have a pending payment for this event. Please wait for it to be reviewed." }
  } else {
    const pendingExisting = await db.purchase.findFirst({
      where: { userId: user.id, planId: (await db.plan.findUniqueOrThrow({ where: { key: "UNLIMITED" } })).id, status: { in: ["PENDING", "SUBMITTED", "UNDER_REVIEW"] } },
    })
    if (pendingExisting) return { ok: false, error: "You already have a pending Unlimited payment under review." }
  }

  // A payment/transaction reference can only back one purchase — otherwise a single real
  // payment could be reused to try to unlock several plans.
  const duplicateReference = await db.purchase.findFirst({
    where: {
      paymentReference: { equals: d.paymentReference, mode: "insensitive" },
      status: { in: ["PENDING", "SUBMITTED", "UNDER_REVIEW", "APPROVED"] },
    },
    select: { id: true },
  })
  if (duplicateReference) return { ok: false, error: "That payment reference has already been submitted. Check the reference number on your receipt." }

  const plan = await db.plan.findUniqueOrThrow({ where: { key: d.planKey } })

  const purchase = await db.purchase.create({
    data: {
      userId: user.id,
      eventId: d.planKey === "UNLIMITED" ? null : d.eventId,
      planId: plan.id,
      amount: plan.price,
      paymentReference: d.paymentReference,
      paymentMethod: d.paymentMethod,
      proofImageUrl: d.proofImageUrl || null,
      status: "SUBMITTED",
    },
  })

  await sendEmail({
    to: user.email!,
    subject: "Payment received — under review",
    html: paymentStatusTemplate(user.name ?? "there", "PENDING", plan.name),
  })

  revalidatePath("/dashboard/purchases")
  return { ok: true, data: { purchaseId: purchase.id } }
}

export async function listMyPurchases() {
  const user = await requireUser()
  return db.purchase.findMany({
    relationLoadStrategy: "join",
    where: { userId: user.id },
    include: { plan: true, event: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Self-heals: ensures every APPROVED purchase has an entitlement row. A REVOKED entitlement is an
 * explicit admin decision (e.g. refund) and is never reactivated here.
 */
export async function restorePurchases(): Promise<ActionResult<{ restored: number }>> {
  const user = await requireUser()

  const approved = await db.purchase.findMany({
    relationLoadStrategy: "join",
    where: { userId: user.id, status: "APPROVED" },
    include: { plan: true, entitlement: true },
  })

  let restored = 0
  for (const purchase of approved) {
    if (purchase.entitlement) continue
    if (purchase.plan.scope === "EVENT" && !purchase.eventId) continue
    await db.entitlement.create({
      data: {
        userId: user.id,
        eventId: purchase.eventId,
        planId: purchase.planId,
        scope: purchase.plan.scope,
        purchaseId: purchase.id,
        activatedAt: purchase.approvedAt ?? new Date(),
      },
    })
    restored++
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/purchases")
  return { ok: true, data: { restored } }
}
