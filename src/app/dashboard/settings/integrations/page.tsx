import Link from "next/link"
import { requireUser } from "@/lib/session"
import { getMetaConfig } from "@/lib/messenger/config"
import { canUseMessenger, getConnectionSummary } from "@/lib/messenger/meta-messenger-service"
import { MetaIntegrationCard } from "@/components/integrations/meta-integration-card"

export const dynamic = "force-dynamic"

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  connected: { tone: "ok", text: "Your Facebook Page is connected." },
  choose_page: { tone: "ok", text: "Choose the Page you want to connect." },
  no_pages: { tone: "warn", text: "Meta didn't return any Pages you can message from. You need a Facebook Page where you have messaging access." },
  cancelled: { tone: "warn", text: "Connection cancelled. Nothing was changed." },
  invalid_state: { tone: "warn", text: "That connection link expired or didn't start here. Please click Connect Meta again." },
  rate_limited: { tone: "warn", text: "Too many connection attempts. Please wait a few minutes." },
  unavailable: { tone: "warn", text: "The Meta integration isn't available for your account yet." },
  error: { tone: "warn", text: "Meta couldn't complete the connection. Please try again." },
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ meta?: string }> }) {
  const user = await requireUser()
  const { meta } = await searchParams
  const config = getMetaConfig()
  const [allowed, connection] = await Promise.all([
    canUseMessenger(user.id, null),
    config.live ? getConnectionSummary(user.id) : Promise.resolve(null),
  ])
  const notice = meta ? NOTICES[meta] : undefined

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground"><Link href="/dashboard/settings" className="hover:underline">Settings</Link> / Integrations</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Integrations</h1>
      </div>
      {notice && (
        <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${notice.tone === "ok" ? "bg-secondary/50" : "border-amber-300 bg-amber-50 text-amber-900"}`}>{notice.text}</p>
      )}
      <MetaIntegrationCard live={config.live} allowed={allowed} connection={connection} />
    </div>
  )
}
