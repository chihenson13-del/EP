import { db } from "@/lib/db"
import { getMetaConfig } from "@/lib/messenger/config"

/** Admin view of the Meta Messenger integration. Shows configuration by variable NAME only, never values or tokens. */
export async function MetaIntegrationStatus() {
  const config = getMetaConfig()
  const connections = await db.metaConnection.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, status: true, pageName: true, connectedAt: true, lastWebhookAt: true, lastError: true, user: { select: { email: true } } },
  }).catch(() => [])

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-sm font-semibold uppercase tracking-[0.14em]">Meta Messenger integration</p>
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{config.live ? "Enabled" : "Disabled"}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">META_MESSENGER_ENABLED</dt><dd>{config.enabled ? "true" : "false"}</dd>
        <dt className="text-muted-foreground">Configuration</dt>
        <dd>{config.missing.length ? <span className="text-amber-700">Missing: {config.missing.join(", ")}</span> : "Complete"}</dd>
        <dt className="text-muted-foreground">Connected Pages</dt><dd>{connections.filter((c) => c.status === "CONNECTED").length}</dd>
      </dl>
      {connections.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-1 pr-3">Organizer</th><th className="py-1 pr-3">Page</th><th className="py-1 pr-3">Status</th><th className="py-1 pr-3">Connected</th><th className="py-1 pr-3">Last webhook</th><th className="py-1">Last error</th></tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-1 pr-3">{c.user.email}</td>
                  <td className="py-1 pr-3">{c.pageName ?? "—"}</td>
                  <td className="py-1 pr-3">{c.status}</td>
                  <td className="py-1 pr-3">{c.connectedAt?.toISOString().slice(0, 10) ?? "—"}</td>
                  <td className="py-1 pr-3">{c.lastWebhookAt?.toISOString().slice(0, 16).replace("T", " ") ?? "—"}</td>
                  <td className="py-1">{c.lastError ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Stays disabled until the Meta app is approved. See docs/meta-messenger-integration.md for the launch checklist.</p>
    </div>
  )
}
