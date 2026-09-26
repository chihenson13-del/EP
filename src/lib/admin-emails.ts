/**
 * The admin allowlist: the only emails that may hold the ADMIN role.
 * Comes from ADMIN_BOOTSTRAP_EMAIL and ADMIN_EMAILS, either of which may hold several comma-separated addresses.
 *
 * An email on this list is promoted to ADMIN when it signs in with a provider that has verified the address
 * (Google). An account that is ADMIN in the database but whose email is no longer on the list is treated as a
 * regular user everywhere, and is demoted in the database the next time its role is read. Removing someone's
 * admin access is therefore just: take their email off the list and redeploy.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const wanted = email.trim().toLowerCase()
  return [process.env.ADMIN_BOOTSTRAP_EMAIL, process.env.ADMIN_EMAILS]
    .flatMap((value) => (value ?? "").split(","))
    .some((candidate) => candidate.trim() !== "" && candidate.trim().toLowerCase() === wanted)
}

/** The role an account actually has: ADMIN only while its email is still on the allowlist. */
export function effectiveRole<R extends string>(role: R, email: string | null | undefined): R | "USER" {
  return role === "ADMIN" && !isAdminEmail(email) ? "USER" : role
}
