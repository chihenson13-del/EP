import { cache } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"

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

/** The role is re-read from the database (once per request) so a demotion takes effect immediately. */
const getFreshRole = cache(async (userId: string) => {
  const row = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  return row?.role ?? null
})

export async function requireAdmin() {
  const user = await requireUser()
  if ((await getFreshRole(user.id)) !== "ADMIN") redirect("/dashboard")
  return user
}
