/**
 * Emails that are promoted to ADMIN when they sign in with a provider that has verified the address (Google).
 * Comes from ADMIN_BOOTSTRAP_EMAIL and ADMIN_EMAILS, either of which may hold several comma-separated addresses.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const wanted = email.trim().toLowerCase()
  return [process.env.ADMIN_BOOTSTRAP_EMAIL, process.env.ADMIN_EMAILS]
    .flatMap((value) => (value ?? "").split(","))
    .some((candidate) => candidate.trim().toLowerCase() === wanted)
}
