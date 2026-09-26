import { cache } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { effectiveRole } from "@/lib/admin-emails"

/**
 * Memoised per request: a page, its layouts, and the components they render can all ask for the
 * current user without each one re-verifying the JWT.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth()
  return session?.user ?? null
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

/**
 * The role is re-read from the database (once per request) so a demotion takes effect immediately.
 * An ADMIN whose email is no longer on the admin allowlist is demoted here, on the spot.
 */
const getFreshRole = cache(async (userId: string) => {
  const row = await db.user.findUnique({ where: { id: userId }, select: { role: true, email: true } })
  if (!row) return null
  const role = effectiveRole(row.role, row.email)
  if (role !== row.role) await db.user.update({ where: { id: userId }, data: { role: "USER" } })
  return role
})

export async function requireAdmin() {
  const user = await requireUser()
  if ((await getFreshRole(user.id)) !== "ADMIN") redirect("/dashboard")
  return user
}
