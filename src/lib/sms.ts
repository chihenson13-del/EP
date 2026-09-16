export type SendSmsInput = {
  to: string
  message: string
}

export type SendSmsResult = {
  ok: boolean
  mock: boolean
  provider: string
  error?: string
}

const SMS_SID = process.env.SMS_PROVIDER_ACCOUNT_SID
const SMS_TOKEN = process.env.SMS_PROVIDER_AUTH_TOKEN
const SMS_FROM = process.env.SMS_PROVIDER_FROM_NUMBER

/**
 * Provider-ready SMS sender (Twilio-compatible REST API shape).
 * If SMS credentials are not configured, this runs in clearly-labeled
 * MOCK SMS MODE: nothing is actually sent, and the result always reports
 * `mock: true` so the UI never claims a mock message was delivered.
 */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  if (!SMS_SID || !SMS_TOKEN || !SMS_FROM) {
    console.log(`[MOCK SMS MODE] to=${input.to} message="${input.message}"`)
    return { ok: true, mock: true, provider: "mock" }
  }

  try {
    const auth = Buffer.from(`${SMS_SID}:${SMS_TOKEN}`).toString("base64")
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SMS_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: input.to, From: SMS_FROM, Body: input.message }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, mock: false, provider: "twilio", error: text }
    }
    return { ok: true, mock: false, provider: "twilio" }
  } catch (err) {
    return { ok: false, mock: false, provider: "twilio", error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/** Replace {name} {event} {date} {time} {venue} {rsvp_link} in a message template. */
export function fillMessageVariables(
  template: string,
  vars: { name?: string; event?: string; date?: string; time?: string; venue?: string; rsvp_link?: string }
): string {
  return template
    .replace(/\{name\}/g, vars.name ?? "")
    .replace(/\{event\}/g, vars.event ?? "")
    .replace(/\{date\}/g, vars.date ?? "")
    .replace(/\{time\}/g, vars.time ?? "")
    .replace(/\{venue\}/g, vars.venue ?? "")
    .replace(/\{rsvp_link\}/g, vars.rsvp_link ?? "")
}
