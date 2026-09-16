"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations/auth"
import type { ActionResult } from "@/actions/events"

export async function updateProfile(input: { name: string; businessName?: string; brandColor?: string }): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, businessName: parsed.data.businessName || null, brandColor: parsed.data.brandColor || null },
  })

  revalidatePath("/dashboard/settings")
  return { ok: true, data: undefined }
}

export async function updateBrandLogo(logoUrl: string): Promise<ActionResult> {
  const user = await requireUser()
  await db.user.update({ where: { id: user.id }, data: { brandLogoUrl: logoUrl } })
  revalidatePath("/dashboard/settings")
  return { ok: true, data: undefined }
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const dbUser = await db.user.findUniqueOrThrow({ where: { id: user.id } })
  if (!dbUser.passwordHash) return { ok: false, error: "This account uses social login and has no password to change." }

  const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash)
  if (!valid) return { ok: false, error: "Current password is incorrect." }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })

  return { ok: true, data: undefined }
}
