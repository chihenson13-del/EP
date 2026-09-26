"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Check, Link2Off, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessengerIcon } from "@/components/guests/facebook-contact"
import { chooseMetaPage, disconnectMeta } from "@/actions/messenger"
import { safe } from "@/lib/safe-action"

type Connection = {
  status: "PENDING_PAGE" | "CONNECTED" | "NEEDS_RECONNECT" | "DISCONNECTED"
  pageId: string | null
  pageName: string | null
  connectedAt: string | null
  lastWebhookAt: string | null
  lastError: string | null
  pendingPages: { id: string; name: string }[]
} | null

const CONNECT_URL = "/api/integrations/meta/connect"

/**
 * Meta / Messenger connection card. "Connect Meta" is a plain link to our server route, which starts Meta's own
 * OAuth dialog; Events Partner never asks for a Facebook password. Tokens are never sent to this component.
 */
export function MetaIntegrationCard({ live, allowed, connection }: { live: boolean; allowed: boolean; connection: Connection }) {
  const [pending, startTransition] = useTransition()

  function choose(pageId: string) {
    startTransition(async () => {
      const result = await safe(chooseMetaPage(pageId))
      if (!result.ok) toast.error(result.error)
      else toast.success("Page connected.")
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await safe(disconnectMeta())
      if (!result.ok) toast.error(result.error)
      else toast.success("Meta disconnected. Messenger sending is off.")
    })
  }

  const connected = connection?.status === "CONNECTED"

  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4" aria-labelledby="meta-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[var(--brand-lavender)] text-[var(--brand-purple-deep)]"><MessengerIcon className="size-5" /></span>
          <div>
            <h2 id="meta-heading" className="font-heading font-semibold">Meta / Messenger</h2>
            <p className="text-sm text-muted-foreground">Connect your eligible Meta account or Page to enable official Messenger communication where supported by Meta.</p>
          </div>
        </div>
        {connected ? <Badge>Meta connected</Badge> : <Badge variant="outline">{live && allowed ? "Not connected" : "Not available yet"}</Badge>}
      </div>

      {!live || !allowed ? (
        <div className="rounded-xl bg-secondary/40 p-4 text-sm space-y-2">
          <p className="font-medium">Official Messenger messaging isn&apos;t available yet.</p>
          <p className="text-muted-foreground">
            It will open once Meta has reviewed and approved Events Partner. Until then you can still reach guests yourself:
            add their Facebook profile in Guests and use <strong>Message on Facebook</strong>.
          </p>
        </div>
      ) : (
        <>
          {connection?.status === "PENDING_PAGE" && connection.pendingPages.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose the Page you want to connect</p>
              <ul className="space-y-2">
                {connection.pendingPages.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Button size="sm" onClick={() => choose(p.id)} disabled={pending}><Check className="size-3.5" /> Connect this Page</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {connected && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Connected Page</dt><dd className="font-medium">{connection?.pageName}</dd>
              <dt className="text-muted-foreground">Status</dt><dd>Connected</dd>
              {connection?.connectedAt && (<><dt className="text-muted-foreground">Since</dt><dd>{connection.connectedAt.slice(0, 10)}</dd></>)}
            </dl>
          )}

          {connection?.status === "NEEDS_RECONNECT" && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Meta ended this connection (the access expired or a permission was removed). Reconnect to keep messaging.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant={connected ? "outline" : "default"}>
              <a href={CONNECT_URL}>{connected || connection?.status === "NEEDS_RECONNECT" ? <><RefreshCw className="size-4" /> Reconnect</> : "Connect Meta"}</a>
            </Button>
            {connection && connection.status !== "DISCONNECTED" && (
              <Button variant="ghost" onClick={remove} disabled={pending}><Link2Off className="size-4" /> Disconnect</Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Meta only lets a Page message people who have messaged it first, and only within 24 hours of their last message.
            Guests opt in by opening their personal Messenger link, which you can copy from each guest&apos;s details.
          </p>
        </>
      )}
    </section>
  )
}
