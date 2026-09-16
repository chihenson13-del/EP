function shell(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fff9f2;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#fff9f2;">${preheader}</span>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff9f2;padding:32px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#6f5a86;padding:24px 32px;">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Events Partner</span>
          </td></tr>
          <tr><td style="padding:32px;color:#403447;font-size:15px;line-height:1.6;">
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f3e8dc;color:#756d78;font-size:12px;">
            You're receiving this because of activity on your Events Partner account.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#6f5a86;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;">${label}</a>`
}

export function verifyEmailTemplate(name: string, url: string) {
  return shell(
    "Verify your email to activate your account",
    `<p>Hi ${name},</p><p>Thanks for creating an Events Partner account. Please verify your email address to get started.</p>${button(url, "Verify email")}<p style="margin-top:20px;color:#756d78;font-size:13px;">This link expires in 24 hours.</p>`
  )
}

export function resetPasswordTemplate(name: string, url: string) {
  return shell(
    "Reset your Events Partner password",
    `<p>Hi ${name},</p><p>We received a request to reset your password. If this was you, click below to choose a new one.</p>${button(url, "Reset password")}<p style="margin-top:20px;color:#756d78;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`
  )
}

export function invitationTemplate(opts: {
  guestName: string
  eventName: string
  hostName?: string | null
  dateLabel?: string
  venueLabel?: string
  rsvpUrl: string
  message?: string
}) {
  return shell(
    `You're invited to ${opts.eventName}`,
    `<p>Hi ${opts.guestName},</p>
     <p>${opts.message ?? `${opts.hostName ?? "You"} would love for you to join <strong>${opts.eventName}</strong>.`}</p>
     ${opts.dateLabel ? `<p><strong>When:</strong> ${opts.dateLabel}</p>` : ""}
     ${opts.venueLabel ? `<p><strong>Where:</strong> ${opts.venueLabel}</p>` : ""}
     ${button(opts.rsvpUrl, "View invitation & RSVP")}`
  )
}

export function reminderTemplate(opts: { guestName: string; eventName: string; dateLabel?: string; rsvpUrl: string }) {
  return shell(
    `Reminder: ${opts.eventName}`,
    `<p>Hi ${opts.guestName},</p><p>Just a friendly reminder about <strong>${opts.eventName}</strong>${opts.dateLabel ? ` on ${opts.dateLabel}` : ""}. We'd love to know if you can make it.</p>${button(opts.rsvpUrl, "RSVP now")}`
  )
}

export function paymentStatusTemplate(name: string, status: "APPROVED" | "PENDING" | "REJECTED", planName: string) {
  const copy = {
    APPROVED: `Your ${planName} access is now active. All the matching features are unlocked.`,
    PENDING: `Your payment for ${planName} is being reviewed. We'll email you as soon as it's approved.`,
    REJECTED: `Your payment for ${planName} could not be verified. Please review your payment details and try again, or contact support.`,
  }[status]
  return shell(`Payment ${status.toLowerCase()}`, `<p>Hi ${name},</p><p>${copy}</p>`)
}
