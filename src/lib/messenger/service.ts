/**
 * Messenger facade used by Guest Management. Two separate things live side by side:
 *
 *  A. Facebook profile shortcut (always available): Guest.facebookProfileUrl + "Message on Facebook" opens Facebook
 *     and the organizer messages the guest themselves. Events Partner sends nothing and records nothing.
 *
 *  B. Official Meta Messenger integration (lib/messenger/meta-messenger-service.ts): OFF unless
 *     META_MESSENGER_ENABLED=true and the Meta app is fully configured and approved. It never uses scraping,
 *     browser automation, collected Facebook passwords, or personal-account messaging.
 */
import { getMetaConfig } from "@/lib/messenger/config"
import * as meta from "@/lib/messenger/meta-messenger-service"
import { db } from "@/lib/db"

/** True only when the official integration is switched on and fully configured (server-side check). */
export function isMessengerIntegrationLive(): boolean {
  return getMetaConfig().live
}

export const messengerService = {
  /** Whether this organizer has a connected Page (always false while the integration is off). */
  async isConnected(ownerId: string): Promise<boolean> {
    if (!isMessengerIntegrationLive()) return false
    const c = await db.metaConnection.findUnique({ where: { userId: ownerId }, select: { status: true } })
    return c?.status === "CONNECTED"
  },
  getEligibility: meta.getEligibility,
  sendMessage: meta.sendMessage,
}
