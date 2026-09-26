/**
 * Messenger service: the single place Events Partner would talk to Meta's Messenger Platform.
 *
 * CURRENT RELEASE: API messaging is DISABLED. Nothing here calls any Meta API, needs Meta credentials, or returns
 * a made-up result. What organizers have today is the manual shortcut: a guest's saved Facebook profile link
 * (Guest.facebookProfileUrl) opens Facebook/Messenger, and the organizer writes and sends the message themselves.
 * Events Partner never claims that message was sent.
 *
 * Automatic Messenger messages can only be added through an official Meta integration: a Meta app with the
 * approved permissions, OAuth for a connected Page, secure server-side token storage, webhooks, and Meta's own
 * recipient-eligibility rules (a Facebook profile URL alone does not make someone messageable through the API).
 * That integration would also need message templates, delivery/error handling from webhooks, opt-in handling,
 * audit logs, rate limiting and admin controls. None of it is active. Never replace it with scraping, browser
 * automation, collected Facebook passwords, or messaging from a personal account.
 */

/** Server-side switch. It stays false until the official integration above exists and Meta has approved it. */
export const MESSENGER_FEATURE_ENABLED = false

export type MessengerUnavailable = { ok: false; reason: "DISABLED"; message: string }

export const MESSENGER_UNAVAILABLE: MessengerUnavailable = {
  ok: false,
  reason: "DISABLED",
  message: "Messenger messaging isn't available. Use \"Message on Facebook\" to contact the guest yourself.",
}

export interface MessengerService {
  /** Whether an organizer has a connected, approved Meta Page. */
  isConnected(ownerId: string): Promise<boolean>
  /** Send through the official API. Only ever reports success when Meta confirms it. */
  sendMessage(input: { ownerId: string; eventId: string; guestId: string; text: string }): Promise<MessengerUnavailable>
  /** Delivery state as reported by Meta webhooks. */
  getConversationStatus(input: { ownerId: string; guestId: string }): Promise<MessengerUnavailable>
}

/** The only implementation in this release: every call reports "unavailable" and touches nothing external. */
export const messengerService: MessengerService = {
  async isConnected() {
    return false
  },
  async sendMessage() {
    return MESSENGER_UNAVAILABLE
  },
  async getConversationStatus() {
    return MESSENGER_UNAVAILABLE
  },
}
