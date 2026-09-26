# Meta App Review preparation — Events Partner Messenger

Use together with `docs/meta-messenger-integration.md`. Re-verify every requirement against Meta's current docs before submitting.

## App purpose
Events Partner is an event-planning platform (invitations, RSVPs, seating, check-in). Organizers can connect **their own Facebook Page** so they can reply, through Messenger, to guests who contacted that Page about the event (for example to answer a question about the venue or their RSVP).

## User flow
1. Organizer → Settings → Integrations → **Connect Meta** → Meta's Facebook Login for Business dialog → grants Page permissions.
2. If they manage several Pages, they choose one ("Choose the Page you want to connect").
3. In Guests → a guest → Official Messenger, the organizer copies the guest's personal Messenger link and shares it with the guest.
4. The guest opens the link and messages the Page (guest-initiated). Meta sends Events Partner the PSID via webhook.
5. Within 24 hours of the guest's last message, the organizer can reply from Events Partner ("Send Messenger Message"). Outside the window the composer is hidden and the UI says "Needs guest interaction".
6. Organizer can Disconnect at any time (tokens deleted, Page unsubscribed).

## Permissions and why
| Permission | Why |
|---|---|
| `pages_show_list` | List the Pages the organizer manages so they can pick one. |
| `pages_messaging` | Receive the guest's messages/referrals and send replies within the standard window. |
| `pages_manage_metadata` | Subscribe the chosen Page to the app's webhooks (`/{page-id}/subscribed_apps`). |
| `business_management` | Listed by Meta as a required dependency for Page messaging via Login for Business. |

## Screenshots / screencast needed
- Settings → Integrations card before connecting; Meta login dialog; Page chooser; "Meta connected" state; Disconnect.
- Guest Details: Official Messenger showing "Needs guest interaction" + Copy link; the guest opening the m.me link in Messenger; Guest Details showing "Eligible"; composing and sending a reply; the message arriving in Messenger; status "Sent".
- Admin → Settings → Meta integration status.

## Test instructions for reviewers
- Provide a test organizer account on https://eventspartner.vercel.app (admin role gives access while the add-on is unreleased), a test event with a guest, and a test Page with the reviewer added as a tester.
- Steps: log in → Settings → Integrations → Connect Meta → choose the test Page → Guests → open the guest → Copy guest's Messenger link → open it as the test user and send "hi" → back in Events Partner refresh the guest → send a reply.

## URLs
- Privacy Policy: https://eventspartner.vercel.app/privacy (must be updated to cover Messenger data before submission)
- Terms: https://eventspartner.vercel.app/terms
- Data deletion callback: https://eventspartner.vercel.app/api/integrations/meta/data-deletion (status page: /meta/data-deletion?code=…)
- OAuth redirect: https://eventspartner.vercel.app/api/integrations/meta/callback
- Webhook: https://eventspartner.vercel.app/api/webhooks/meta (fields: messages, messaging_postbacks, messaging_referrals, message_deliveries, message_reads)

## Recipient eligibility explanation (for the reviewer)
Events Partner never messages anyone who has not first contacted the Page. It sends only `messaging_type: RESPONSE` inside the 24-hour standard window, uses no message tags, offers no bulk sending, and does not store the guest's message text — only the PSID, the opt-in time/source, the last-interaction time, and delivery status of messages the organizer sent.

## Data handling
Stored: Page ID/name, encrypted Page access token (AES-256-GCM), the connecting user's app-scoped ID (for deletion requests), guest PSID links, sent-message text and Meta message IDs/status. Not stored: Facebook passwords, guest message contents, profile data. Deletion: via the Meta callback, Disconnect, or deleting the guest/event.
