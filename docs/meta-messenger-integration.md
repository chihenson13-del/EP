# Meta Messenger integration — verified requirements

Status: **DISABLED** (`META_MESSENGER_ENABLED=false`). Verified against Meta's official developer documentation on 2026-09-26.
Re-check every item below before enabling; Meta changes these rules.

## Two separate features

| | What it does | Status |
|---|---|---|
| **A. Facebook profile shortcut** | Organizer saves a guest's Facebook profile / m.me link. "Message on Facebook" opens it; the organizer sends the message themselves. | Live |
| **B. Official Meta Messenger integration** | Organizer connects their Facebook **Page**; Events Partner replies to guests through the Messenger Platform Send API. | Built, **disabled** |

A saved profile URL never makes a guest messageable through the API (see "Recipients").

## Verified Meta requirements

**App and permissions** ([Messenger Platform overview](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview))
- A Meta app with the **Messenger use case**; Pages are connected via **Facebook Login for Business**.
- Permissions: `pages_messaging`, `pages_manage_metadata`, `pages_show_list`, `business_management` (listed as a required dependency). `pages_read_engagement` is also listed by Meta; Events Partner does not read engagement data and does not request it — confirm during App Review whether it is required.
- **Standard Access** only works for people with a role on the app/Page. **Advanced Access** (any organizer's Page) needs **App Review**; **Business Verification** is required when non-role users use the app.

**Recipients and the messaging window** ([policy](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy), [send messages](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages))
- "A person must initiate the conversation." Businesses cannot start conversations.
- Recipients are identified by a **Page-scoped ID (PSID)**, assigned when the person messages the Page. IDs from Facebook Login are app-scoped and don't work for Messenger.
- **Standard messaging window: 24 hours** after the person's last message or interaction (message, Get Started, m.me link with `ref` on an existing thread, reactions, …). Inside it, `messaging_type` `RESPONSE`/`UPDATE` are allowed.
- **Message tags `CONFIRMED_EVENT_UPDATE`, `ACCOUNT_UPDATE`, `POST_PURCHASE_UPDATE` were retired on 27 April 2026** (requests now fail with error 100). Meta points to *Utility Templates* or the *Marketing Messages API* instead ([changelog](https://developers.facebook.com/documentation/business-messaging/messenger-platform/changelog/)). **I could not verify Messenger-specific requirements for those two products, so they are NOT implemented.** Consequence: no event reminders / invitations outside the 24-hour window, and no bulk or proactive messaging.
- `HUMAN_AGENT` tag (7-day window for human replies) exists but needs its own permission/approval; not implemented.

**How guests become reachable** ([m.me links](https://developers.facebook.com/documentation/business-messaging/messenger-platform/discovery/m-me-links))
- Each guest gets a personal link `https://m.me/<PAGE_ID>?ref=<ref>` (ref: alphanumeric, HMAC-signed so it can't be forged).
- New thread: Meta sends `messaging_postbacks` with a `referral` (requires the Page's **Get Started** button). Existing thread: `messaging_referrals`. Both include the PSID and reset the 24-hour window.
- Events Partner links the PSID to the guest only if the ref is valid **and** the guest belongs to that Page owner's event.

**Webhooks** ([webhooks](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks))
- Verification: `GET` with `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge` → echo the challenge.
- Every POST carries `X-Hub-Signature-256` = HMAC-SHA256 of the **raw body** with the app secret. Unsigned/invalid → 401.
- Respond `200` within 5 seconds; Meta retries, alerts after 15 min, disables after 1 hour of failures. Replays are deduplicated.
- Subscribing a Page needs `pages_messaging` + `pages_manage_metadata` and a Page token with MODERATE capability. Fields used: `messages`, `messaging_postbacks`, `messaging_referrals`, `message_deliveries`, `message_reads`.

**OAuth** ([manual login flow](https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow))
- Dialog `https://www.facebook.com/{version}/dialog/oauth` with `client_id`, `redirect_uri`, `state`, `scope` (or `config_id` for Login for Business).
- Code exchange at `https://graph.facebook.com/{version}/oauth/access_token` server-side; `redirect_uri` must match exactly; `state` must be validated (CSRF).

**Data deletion** ([data deletion callback](https://developers.facebook.com/documentation/development/create-an-app/app-dashboard/data-deletion-callback))
- Either a Data Deletion Callback URL or Instructions URL is mandatory. Callback receives POST `signed_request` (HMAC-SHA256, app secret) and must return `{ url, confirmation_code }`.

**Versions and limits**
- Graph API: changelog lists **v26.0**; Send API examples use **v25.0**. Set `META_GRAPH_API_VERSION` explicitly.
- Rate limiting: error code **613**; Meta publishes no fixed threshold on these pages. Text messages are capped at 2,000 characters (Send API reference).

## What is implemented (all behind the switch)

| Piece | Where |
|---|---|
| Config + switch (`live` only if `META_MESSENGER_ENABLED=true` AND all vars valid) | `src/lib/messenger/config.ts` |
| AES-256-GCM token encryption, webhook signature, signed_request | `src/lib/messenger/crypto.ts` |
| OAuth start / callback (signed state bound to the user, httpOnly cookie) | `src/app/api/integrations/meta/connect`, `.../callback`, `src/lib/messenger/oauth-state.ts` |
| Page choice, connect, disconnect, eligibility, send, webhook handling, data deletion | `src/lib/messenger/meta-messenger-service.ts` |
| Webhook endpoint | `src/app/api/webhooks/meta/route.ts` |
| Data-deletion callback + status page | `src/app/api/integrations/meta/data-deletion`, `src/app/meta/data-deletion` |
| Settings → Integrations → Meta / Messenger | `src/app/dashboard/settings/integrations` |
| Guest Details → Official Messenger (eligibility, opt-in link, composer) | `src/components/guests/official-messenger-panel.tsx` |
| Admin status (config by variable name, connections, last webhook, errors) | `src/components/admin/meta-integration-status.tsx` |
| Tables: MetaConnection, MessengerRecipient, MessengerMessage, MetaWebhookEvent, MetaDataDeletionRequest | `prisma/schema.prisma` (applied via Admin → Database updates) |
| Entitlement `meta_messenger_enabled` — in **no plan**; only admins can use it while testing | `src/lib/entitlements.ts` |

Security properties: tokens only encrypted at rest, never logged, never sent to the browser, never in URLs (sent in the `Authorization` header with `appsecret_proof`); one Page belongs to one account; every action checks event access and uses the **event owner's** connection; rate limits per organizer (30/min) and per guest (5/min); idempotency key per message; statuses: SENDING → SENT (only with a Meta `message_id`) → DELIVERED/READ (only from webhooks) or FAILED/UNAVAILABLE. Guest message text is never stored.

## Remaining Meta-side actions (in order)

1. Create a Meta app with the Messenger use case (developers.facebook.com). **Not done.**
2. Add a Facebook Page you manage; set its **Get Started** button.
3. Configure Facebook Login for Business; add Valid OAuth Redirect URI `https://eventspartner.vercel.app/api/integrations/meta/callback`.
4. Add webhook callback `https://eventspartner.vercel.app/api/webhooks/meta` with your verify token; subscribe the fields above.
5. Set Data Deletion Callback URL `https://eventspartner.vercel.app/api/integrations/meta/data-deletion`; Privacy Policy `/privacy`; Terms `/terms`. Update the Privacy Policy to describe Messenger data (Page connection, PSIDs, message status) before review.
6. Set the Vercel env vars from `.env.example` (Production), keep `META_MESSENGER_ENABLED=false`, test in **development mode** with app-role test users by temporarily enabling on a Preview.
7. Complete **Business Verification** and **App Review** for Advanced Access (`docs/meta-app-review.md`).
8. Decide pricing for the Messenger add-on and grant `FEATURES.META_MESSENGER` from that purchase.
9. Only then set `META_MESSENGER_ENABLED=true` in Production and run a real smoke test.

## Status report

- META API DOCUMENTATION VERIFIED: **YES** (sources above; Utility Templates / Marketing Messages for Messenger: **not verified**)
- META APP CREATED: **NO**
- OAUTH: **NOT CONFIGURED** (code built; state/CSRF logic unit-tested)
- WEBHOOKS: **NOT CONFIGURED** (signature + verification logic unit-tested)
- TOKEN SECURITY: **PASS** (encryption round-trip / tamper tests; tokens never leave the server) — end-to-end with real Meta tokens not yet tested
- RECIPIENT ELIGIBILITY: **NOT CONFIGURED** (opt-in ref forgery tests pass)
- MESSAGING: **NOT APPROVED / NOT CONFIGURED**
- APP REVIEW: **REQUIRED** (Advanced Access) — not started
- PRODUCTION: **DISABLED**
