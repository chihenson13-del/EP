import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { effectiveRole } from "@/lib/admin-emails"
import { getMetaConfig, META_WEBHOOK_FIELDS, MESSENGER_TEXT_LIMIT, STANDARD_WINDOW_MS, type MetaConfig } from "@/lib/messenger/config"
import { decryptSecret, encryptSecret } from "@/lib/messenger/crypto"
import { graphRequest, GRAPH_ERROR_MESSAGES } from "@/lib/messenger/graph"
import { optInLink, parseOptInRef } from "@/lib/messenger/optin"

/**
 * metaMessengerService — the only code that talks to Meta's Messenger Platform.
 *
 * Built on Meta's documented rules (docs/meta-messenger-integration.md):
 *  - A person must start the conversation. We never message someone just because a Facebook profile URL is saved.
 *    Guests become reachable only by opening their personal m.me opt-in link (Meta then sends us their PSID).
 *  - Replies are allowed only inside the 24-hour standard messaging window after the guest's last interaction,
 *    sent with messaging_type RESPONSE. The CONFIRMED_EVENT_UPDATE tag was retired on 27 Apr 2026, so there is no
 *    event-reminder path outside the window; bulk/proactive messaging is not offered.
 *  - A message is "SENT" only when the Send API returns a message_id; DELIVERED/READ only from webhooks.
 *
 * Everything is off unless getMetaConfig().live (META_MESSENGER_ENABLED=true + full configuration). Even then,
 * only accounts with the META_MESSENGER entitlement (in no plan today) or admins (for Meta's test/review phase) can use it.
 */

export type Eligibility =
  | { status: "UNAVAILABLE"; label: "Unavailable"; reason: string }
  | { status: "NOT_CONNECTED"; label: "Not connected"; reason: string }
  | { status: "NEEDS_GUEST_INTERACTION"; label: "Needs guest interaction"; reason: string; optInUrl: string }
  | { status: "ELIGIBLE"; label: "Eligible"; reason: string; windowEndsAt: string }
  | { status: "NOT_ELIGIBLE"; label: "Not eligible"; reason: string }

export const BULK_UNAVAILABLE = "Bulk Messenger messaging is not currently available for this account/use case."

type PendingPage = { id: string; name: string; token: string }

/** Feature gate: integration live, and this account is entitled (or is an admin testing before launch). */
export async function canUseMessenger(userId: string, eventId: string | null): Promise<boolean> {
  if (!getMetaConfig().live) return false
  if (await hasFeature(userId, eventId, FEATURES.META_MESSENGER)) return true
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, email: true } })
  return !!user && effectiveRole(user.role, user.email) === "ADMIN"
}

function liveConfig(): MetaConfig | null {
  const status = getMetaConfig()
  return status.live ? status.config : null
}

// ── Connection ──────────────────────────────────────────────────────────

/** Safe view of an organizer's connection for the UI: never includes tokens. */
export async function getConnectionSummary(userId: string) {
  const c = await db.metaConnection.findUnique({
    where: { userId },
    select: { status: true, pageId: true, pageName: true, connectedAt: true, lastWebhookAt: true, lastError: true, pendingPagesEnc: true, pendingExpiresAt: true },
  })
  if (!c) return null
  const config = liveConfig()
  let pendingPages: { id: string; name: string }[] = []
  if (c.status === "PENDING_PAGE" && c.pendingPagesEnc && config && c.pendingExpiresAt && c.pendingExpiresAt > new Date()) {
    const raw = decryptSecret(c.pendingPagesEnc, config.encryptionKey)
    pendingPages = raw ? (JSON.parse(raw) as PendingPage[]).map(({ id, name }) => ({ id, name })) : []
  }
  return {
    status: c.status, pageId: c.pageId, pageName: c.pageName, connectedAt: c.connectedAt?.toISOString() ?? null,
    lastWebhookAt: c.lastWebhookAt?.toISOString() ?? null, lastError: c.lastError, pendingPages,
  }
}

/** OAuth callback: exchange the code, get a long-lived token, list the Pages this person can manage. */
export async function completeOAuth(userId: string, code: string): Promise<{ ok: true; pageCount: number } | { ok: false; error: string }> {
  const config = liveConfig()
  if (!config) return { ok: false, error: "The Meta integration isn't available." }

  const short = await graphRequest<{ access_token: string }>(config, "oauth/access_token", {
    params: { client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code },
  })
  if (!short.ok) return { ok: false, error: GRAPH_ERROR_MESSAGES[short.kind] }

  const long = await graphRequest<{ access_token: string }>(config, "oauth/access_token", {
    params: { grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: short.data.access_token },
  })
  const userToken = long.ok ? long.data.access_token : short.data.access_token

  const me = await graphRequest<{ id: string }>(config, "me", { token: userToken, params: { fields: "id" } })
  const accounts = await graphRequest<{ data: Array<{ id: string; name: string; access_token?: string; tasks?: string[] }> }>(config, "me/accounts", {
    token: userToken, params: { fields: "id,name,access_token,tasks", limit: "100" },
  })
  if (!accounts.ok) return { ok: false, error: GRAPH_ERROR_MESSAGES[accounts.kind] }

  // Only Pages this person may message from (MESSAGING or MODERATE task) and that came with a Page token.
  const pages: PendingPage[] = accounts.data.data
    .filter((p) => p.access_token && (p.tasks ?? []).some((t) => t === "MESSAGING" || t === "MODERATE"))
    .map((p) => ({ id: p.id, name: p.name, token: p.access_token! }))

  await db.metaConnection.upsert({
    where: { userId },
    create: {
      userId, status: "PENDING_PAGE", metaUserId: me.ok ? me.data.id : null,
      pendingPagesEnc: encryptSecret(JSON.stringify(pages), config.encryptionKey), pendingExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
    update: {
      status: "PENDING_PAGE", metaUserId: me.ok ? me.data.id : undefined, lastError: null,
      pendingPagesEnc: encryptSecret(JSON.stringify(pages), config.encryptionKey), pendingExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  })
  if (pages.length === 1) {
    const selected = await selectPage(userId, pages[0].id)
    if (!selected.ok) return selected
  }
  return { ok: true, pageCount: pages.length }
}

/** Connect the chosen Page: subscribe it to our webhooks and store its token encrypted. */
export async function selectPage(userId: string, pageId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = liveConfig()
  if (!config) return { ok: false, error: "The Meta integration isn't available." }
  const conn = await db.metaConnection.findUnique({ where: { userId } })
  if (!conn?.pendingPagesEnc || !conn.pendingExpiresAt || conn.pendingExpiresAt < new Date()) {
    return { ok: false, error: "That connection attempt expired. Please click Connect Meta again." }
  }
  const raw = decryptSecret(conn.pendingPagesEnc, config.encryptionKey)
  const page = raw ? (JSON.parse(raw) as PendingPage[]).find((p) => p.id === pageId) : undefined
  if (!page) return { ok: false, error: "Choose one of the Pages you manage." }

  // One Page belongs to one Events Partner account, so webhooks can never be routed to the wrong organizer.
  const taken = await db.metaConnection.findFirst({ where: { pageId, status: "CONNECTED", NOT: { userId } }, select: { id: true } })
  if (taken) return { ok: false, error: "That Page is already connected to another Events Partner account." }

  const sub = await graphRequest<{ success: boolean }>(config, `${page.id}/subscribed_apps`, {
    method: "POST", token: page.token, params: { subscribed_fields: META_WEBHOOK_FIELDS.join(",") },
  })
  if (!sub.ok) return { ok: false, error: GRAPH_ERROR_MESSAGES[sub.kind] }

  await db.metaConnection.update({
    where: { userId },
    data: {
      status: "CONNECTED", pageId: page.id, pageName: page.name.slice(0, 200),
      pageAccessTokenEnc: encryptSecret(page.token, config.encryptionKey),
      pendingPagesEnc: null, pendingExpiresAt: null, connectedAt: new Date(), lastError: null,
    },
  })
  return { ok: true }
}

/** Stop messaging: unsubscribe the Page (best effort) and wipe tokens. Message history and guest links stay. */
export async function disconnect(userId: string): Promise<void> {
  const conn = await db.metaConnection.findUnique({ where: { userId } })
  if (!conn) return
  const config = liveConfig()
  if (config && conn.pageId && conn.pageAccessTokenEnc) {
    const token = decryptSecret(conn.pageAccessTokenEnc, config.encryptionKey)
    if (token) await graphRequest(config, `${conn.pageId}/subscribed_apps`, { method: "DELETE", token }).catch(() => null)
  }
  await db.metaConnection.update({
    where: { userId },
    data: { status: "DISCONNECTED", pageAccessTokenEnc: null, pendingPagesEnc: null, pendingExpiresAt: null },
  })
}

// ── Eligibility & sending ───────────────────────────────────────────────

export async function getEligibility(userId: string, eventId: string, guestId: string): Promise<Eligibility> {
  if (!(await canUseMessenger(userId, eventId))) {
    return { status: "UNAVAILABLE", label: "Unavailable", reason: "Official Messenger messaging isn't available for this account." }
  }
  const conn = await db.metaConnection.findUnique({ where: { userId }, select: { status: true, pageId: true } })
  if (!conn || conn.status !== "CONNECTED" || !conn.pageId) {
    return { status: "NOT_CONNECTED", label: "Not connected", reason: "Connect your Facebook Page in Settings → Integrations first." }
  }
  const recipient = await db.messengerRecipient.findUnique({ where: { guestId } })
  if (!recipient || recipient.ownerId !== userId) {
    return {
      status: "NEEDS_GUEST_INTERACTION", label: "Needs guest interaction",
      reason: "Meta only allows messages after the guest starts a conversation with your Page. Share their Messenger link with them.",
      optInUrl: optInLink(conn.pageId, guestId),
    }
  }
  if (recipient.pageId !== conn.pageId) {
    return { status: "NOT_ELIGIBLE", label: "Not eligible", reason: "This guest messaged a different Page than the one now connected." }
  }
  const last = recipient.lastInboundAt?.getTime() ?? 0
  if (Date.now() - last > STANDARD_WINDOW_MS) {
    return {
      status: "NEEDS_GUEST_INTERACTION", label: "Needs guest interaction",
      reason: "The guest hasn't messaged your Page in the last 24 hours. Meta allows replies again after they do.",
      optInUrl: optInLink(conn.pageId, guestId),
    }
  }
  return { status: "ELIGIBLE", label: "Eligible", reason: "The guest messaged your Page recently.", windowEndsAt: new Date(last + STANDARD_WINDOW_MS).toISOString() }
}

export type SendOutcome = { ok: true; status: "SENT" } | { ok: false; error: string; status: "FAILED" | "UNAVAILABLE" }

/** Sends one text reply inside the standard window. Idempotent per key; callers must have checked event access. */
export async function sendMessage(input: { userId: string; eventId: string; guestId: string; text: string; idempotencyKey: string }): Promise<SendOutcome> {
  const text = input.text.trim()
  if (!text) return { ok: false, status: "FAILED", error: "Write a message first." }
  if (text.length > MESSENGER_TEXT_LIMIT) return { ok: false, status: "FAILED", error: `Messenger messages can be at most ${MESSENGER_TEXT_LIMIT} characters.` }

  const existing = await db.messengerMessage.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (existing) {
    return existing.status === "FAILED" || existing.status === "UNAVAILABLE"
      ? { ok: false, status: existing.status, error: "That message wasn't sent." }
      : { ok: true, status: "SENT" }
  }

  const eligibility = await getEligibility(input.userId, input.eventId, input.guestId)
  const config = liveConfig()
  if (eligibility.status !== "ELIGIBLE" || !config) return { ok: false, status: "UNAVAILABLE", error: eligibility.reason }

  const conn = await db.metaConnection.findUniqueOrThrow({ where: { userId: input.userId } })
  const recipient = await db.messengerRecipient.findUniqueOrThrow({ where: { guestId: input.guestId } })
  const token = conn.pageAccessTokenEnc ? decryptSecret(conn.pageAccessTokenEnc, config.encryptionKey) : null
  if (!token || !conn.pageId) return { ok: false, status: "UNAVAILABLE", error: GRAPH_ERROR_MESSAGES.TOKEN_EXPIRED }

  const record = await db.messengerMessage.create({
    data: {
      ownerId: input.userId, eventId: input.eventId, guestId: input.guestId, pageId: conn.pageId,
      idempotencyKey: input.idempotencyKey, status: "SENDING", text,
    },
  })

  const res = await graphRequest<{ recipient_id: string; message_id: string }>(config, `${conn.pageId}/messages`, {
    method: "POST", token,
    body: { recipient: { id: recipient.psid }, messaging_type: "RESPONSE", message: { text } },
  })

  if (!res.ok) {
    await db.messengerMessage.update({ where: { id: record.id }, data: { status: "FAILED", errorCode: res.code } })
    if (res.kind === "TOKEN_EXPIRED" || res.kind === "PERMISSION_DENIED") {
      await db.metaConnection.update({ where: { userId: input.userId }, data: { status: "NEEDS_RECONNECT", lastError: res.kind } })
    }
    return { ok: false, status: "FAILED", error: GRAPH_ERROR_MESSAGES[res.kind] }
  }

  await db.messengerMessage.update({ where: { id: record.id }, data: { status: "SENT", metaMessageId: res.data.message_id, sentAt: new Date() } })
  return { ok: true, status: "SENT" }
}

// ── Webhooks ────────────────────────────────────────────────────────────

type MessagingEvent = {
  sender?: { id?: string }
  timestamp?: number
  referral?: { ref?: string }
  postback?: { referral?: { ref?: string } }
  message?: { mid?: string; is_echo?: boolean }
  delivery?: { watermark?: number; mids?: string[] }
  read?: { watermark?: number }
}

/** Store a key once; returns false if this event was already processed (Meta retries / replays). */
async function firstTime(key: string): Promise<boolean> {
  try {
    await db.metaWebhookEvent.create({ data: { key: key.slice(0, 190) } })
    return true
  } catch {
    return false
  }
}

/**
 * Handles an already signature-verified webhook payload. Only Pages connected in Events Partner are processed,
 * and a guest is linked only if the opt-in ref is valid AND the guest's event belongs to that Page's owner.
 * Message text from guests is never stored — only that they interacted (to know the 24-hour window).
 */
export async function handleWebhook(payload: unknown): Promise<void> {
  const body = payload as { object?: string; entry?: Array<{ id?: string; messaging?: MessagingEvent[] }> }
  if (body?.object !== "page" || !Array.isArray(body.entry)) return

  for (const entry of body.entry) {
    const pageId = typeof entry.id === "string" ? entry.id : null
    if (!pageId) continue
    const conn = await db.metaConnection.findFirst({ where: { pageId, status: "CONNECTED" }, select: { userId: true } })
    if (!conn) continue
    await db.metaConnection.update({ where: { userId: conn.userId }, data: { lastWebhookAt: new Date() } })

    for (const ev of entry.messaging ?? []) {
      const psid = ev.sender?.id
      const at = typeof ev.timestamp === "number" ? new Date(ev.timestamp) : new Date()
      if (!psid) continue

      const ref = ev.referral?.ref ?? ev.postback?.referral?.ref
      if (ref) {
        if (!(await firstTime(`ref:${pageId}:${psid}:${ev.timestamp}`))) continue
        const guestId = parseOptInRef(ref)
        if (!guestId) continue
        const guest = await db.guest.findFirst({ where: { id: guestId, event: { ownerId: conn.userId } }, select: { id: true } })
        if (!guest) continue
        await db.messengerRecipient.deleteMany({ where: { pageId, psid, NOT: { guestId } } })
        await db.messengerRecipient.upsert({
          where: { guestId },
          create: { guestId, ownerId: conn.userId, pageId, psid, optInSource: ev.postback ? "GET_STARTED_REF" : "M_ME_REF", lastInboundAt: at },
          update: { ownerId: conn.userId, pageId, psid, lastInboundAt: at },
        })
        continue
      }

      if (ev.message && !ev.message.is_echo) {
        if (!(await firstTime(`msg:${ev.message.mid ?? `${pageId}:${psid}:${ev.timestamp}`}`))) continue
        await db.messengerRecipient.updateMany({ where: { pageId, psid }, data: { lastInboundAt: at } })
        continue
      }

      const recipient = await db.messengerRecipient.findUnique({ where: { pageId_psid: { pageId, psid } }, select: { guestId: true } })
      if (!recipient) continue
      if (ev.delivery?.watermark) {
        await db.messengerMessage.updateMany({
          where: { guestId: recipient.guestId, pageId, status: "SENT", sentAt: { lte: new Date(ev.delivery.watermark) } },
          data: { status: "DELIVERED", deliveredAt: new Date(ev.delivery.watermark) },
        })
      }
      if (ev.read?.watermark) {
        await db.messengerMessage.updateMany({
          where: { guestId: recipient.guestId, pageId, status: { in: ["SENT", "DELIVERED"] }, sentAt: { lte: new Date(ev.read.watermark) } },
          data: { status: "READ", readAt: new Date(ev.read.watermark) },
        })
      }
    }
  }
  if (Math.random() < 0.02) void db.metaWebhookEvent.deleteMany({ where: { receivedAt: { lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }).catch(() => {})
}

// ── Data deletion (Meta requirement for apps using Facebook Login) ──────

export async function deleteMetaUserData(metaUserId: string): Promise<string> {
  const conns = await db.metaConnection.findMany({ where: { metaUserId }, select: { userId: true, pageId: true } })
  for (const c of conns) {
    await db.metaConnection.delete({ where: { userId: c.userId } })
    if (c.pageId) await db.messengerRecipient.deleteMany({ where: { ownerId: c.userId, pageId: c.pageId } })
  }
  const confirmationCode = randomBytes(12).toString("hex")
  await db.metaDataDeletionRequest.create({ data: { confirmationCode, metaUserId, status: "COMPLETED" } })
  return confirmationCode
}
