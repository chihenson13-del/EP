import { requireAdmin } from "@/lib/session"
import { getDisplayPaymentSettings } from "@/lib/platform-settings"
import { PlatformPaymentSettingsForm } from "@/components/admin/platform-payment-settings-form"
import { ComingSoonBadge } from "@/components/addons/sms-coming-soon"
import { SMS_ADDON, SMS_FEATURE_ENABLED } from "@/lib/addons"
import { getMigrationStatus } from "@/lib/db-migrations"
import { DatabaseUpdatesCard } from "@/components/admin/database-updates-card"

export default async function AdminSettingsPage() {
  await requireAdmin()
  const [settings, migrations] = await Promise.all([getDisplayPaymentSettings(), getMigrationStatus()])

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure the payment QR code and receiving account customers see at checkout.</p>
      </div>
      <PlatformPaymentSettingsForm settings={JSON.parse(JSON.stringify(settings))} />

      <DatabaseUpdatesCard migrations={migrations} />

      <div className="rounded-xl border bg-card p-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.14em]">SMS feature</p>
          <ComingSoonBadge />
        </div>
        <p className="text-sm">Status: <span className="font-medium">{SMS_FEATURE_ENABLED ? "Enabled" : "Coming Soon"}</span></p>
        <p className="text-sm text-muted-foreground">
          {SMS_ADDON.name} is paused. No SMS can be sent or scheduled, the SMS provider is never called, and SMS is not part of any plan.
          Provider settings (SMS_PROVIDER_*) are kept so the add-on can be launched later.
        </p>
      </div>
    </div>
  )
}
