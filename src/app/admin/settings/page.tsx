import { getPlatformSettings } from "@/actions/platform-settings"
import { PlatformPaymentSettingsForm } from "@/components/admin/platform-payment-settings-form"

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings()

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure the payment QR code and receiving account customers see at checkout.</p>
      </div>
      <PlatformPaymentSettingsForm settings={JSON.parse(JSON.stringify(settings))} />
    </div>
  )
}
