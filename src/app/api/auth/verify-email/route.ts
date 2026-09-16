import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { consumeEmailVerificationToken, createEmailVerificationToken } from "@/lib/tokens"
import { sendEmail } from "@/lib/mailer"
import { verifyEmailTemplate } from "@/lib/email-templates"

export async function POST(req: Request) {
  const { token, email } = await req.json().catch(() => ({}))
  if (!token || !email) {
    return NextResponse.json({ error: "Missing token or email." }, { status: 400 })
  }

  const valid = await consumeEmailVerificationToken(email, token)
  if (!valid) {
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 })
  }

  const user = await db.user.update({ where: { email }, data: { emailVerified: new Date() } }).catch(() => null)
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function PUT(req: Request) {
  // Resend verification email
  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 })

  const user = await db.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true }) // Don't leak account state
  }

  const token = await createEmailVerificationToken(email)
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  await sendEmail({
    to: email,
    subject: "Verify your Events Partner account",
    html: verifyEmailTemplate(user.name ?? "there", url),
  })

  return NextResponse.json({ ok: true })
}
