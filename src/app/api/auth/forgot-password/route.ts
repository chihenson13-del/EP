import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import { forgotPasswordSchema } from "@/lib/validations/auth"
import { createPasswordResetToken } from "@/lib/tokens"
import { sendEmail, isEmailConfigured } from "@/lib/mailer"
import { resetPasswordTemplate } from "@/lib/email-templates"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  // Stops mailbox flooding. Still answers "ok" so the response never hints at whether an account exists.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`forgot:ip:${clientIp(req.headers)}`, 8, 60 * 60),
    rateLimit(`forgot:email:${parsed.data.email}`, 3, 60 * 60),
  ])
  // emailMock describes the whole site (no email provider configured), not this address, so it leaks nothing about accounts.
  const reply = { ok: true, emailMock: !isEmailConfigured }
  if (!byIp.ok || !byEmail.ok) return NextResponse.json(reply)

  const user = await db.user.findUnique({ where: { email: parsed.data.email } })

  // Always return ok — never reveal whether an account exists.
  if (!user || !user.passwordHash) {
    return NextResponse.json(reply)
  }

  const token = await createPasswordResetToken(user.id)
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  const sent = await sendEmail({
    to: user.email,
    subject: "Reset your Events Partner password",
    html: resetPasswordTemplate(user.name ?? "there", url),
  })
  // The reply stays "ok" either way (it must not reveal whether an account exists), so record failures for the owner.
  if (!sent.ok) console.error(`[forgot-password] email to the account owner failed via ${sent.provider}: ${sent.error}`)

  return NextResponse.json(reply)
}
