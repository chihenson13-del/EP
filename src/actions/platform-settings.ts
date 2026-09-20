"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"
import { isSafeImageUrl, IMAGE_URL_ERROR } from "@/lib/image-url"
import type { ActionResult } from "@/actions/events"

export async function getPlatformSettings() {
  return db.platformSettings.findUnique({ where: { id: "default" } })
}

export async function updatePlatformPaymentSettings(input: {
  paymentQrImageUrl?: string
  paymentAccountName?: string
  paymentAccountInfo?: string
  paymentInstructions?: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  if (input.paymentQrImageUrl && !isSafeImageUrl(input.paymentQrImageUrl)) return { ok: false, error: IMAGE_URL_ERROR }
  if ((input.paymentAccountName?.length ?? 0) > 200 || (input.paymentAccountInfo?.length ?? 0) > 500 || (input.paymentInstructions?.length ?? 0) > 2000) {
    return { ok: false, error: "One of the payment fields is too long." }
  }

  await db.platformSettings.upsert({
    where: { id: "default" },
    update: { ...input, updatedById: admin.id },
    create: { id: "default", ...input, updatedById: admin.id },
  })

  await db.activityLog.create({
    data: { actorId: admin.id, action: "PLATFORM_PAYMENT_SETTINGS_UPDATED", targetType: "PlatformSettings", targetId: "default" },
  })

  revalidatePath("/admin/settings")
  revalidatePath("/checkout")
  return { ok: true, data: undefined }
}
