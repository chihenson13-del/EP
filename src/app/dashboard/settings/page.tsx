import { requireUser } from "@/lib/session"
import { db } from "@/lib/db"
import { hasUnlimitedAccount } from "@/lib/entitlements"
import { AccountSettingsForm } from "@/components/account/account-settings-form"

export default async function AccountSettingsPage() {
  const sessionUser = await requireUser()
  const [user, unlimited] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: sessionUser.id } }),
    hasUnlimitedAccount(sessionUser.id),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile, password, and branding.</p>
      </div>
      <AccountSettingsForm user={JSON.parse(JSON.stringify(user))} hasCoBranding={unlimited} />
    </div>
  )
}
