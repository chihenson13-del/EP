import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { forgotPasswordSchema } from "@/lib/validations/auth"
import { createPasswordResetToken } from "@/lib/tokens"
import { sendEmail } from "@/lib/mailer"
import { resetPasswordTemplate } from "@/lib/email-templates"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } })

  // Always return ok — never reveal whether an account exists.
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: true })
  }

  const token = await createPasswordResetToken(user.id)
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  await sendEmail({
    to: user.email,
    subject: "Reset your Events Partner password",
    html: resetPasswordTemplate(user.name ?? "there", url),
  })

  return NextResponse.json({ ok: true })
}
