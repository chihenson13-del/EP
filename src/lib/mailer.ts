import { Resend } from "resend"

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  from?: string
}

export type SendEmailResult = {
  ok: boolean
  mock: boolean
  provider: string
  error?: string
}

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/** False while the site is in mock email mode (no RESEND_API_KEY), i.e. nothing it "sends" ever leaves the server. */
export const isEmailConfigured = resendClient !== null

/**
 * Provider-ready email sender.
 * If RESEND_API_KEY is not configured, this runs in clearly-labeled
 * MOCK EMAIL MODE: the message is logged, never actually delivered, and
 * the caller is told `mock: true` so the UI can be honest about it.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from ?? process.env.EMAIL_FROM ?? "Events Partner <no-reply@eventspartner.app>"

  if (!resendClient) {
    console.log(`[MOCK EMAIL MODE] to=${input.to} subject="${input.subject}"`)
    return { ok: true, mock: true, provider: "mock" }
  }

  try {
    const result = await resendClient.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })
    if (result.error) {
      return { ok: false, mock: false, provider: "resend", error: result.error.message }
    }
    return { ok: true, mock: false, provider: "resend" }
  } catch (err) {
    return { ok: false, mock: false, provider: "resend", error: err instanceof Error ? err.message : "Unknown error" }
  }
}
