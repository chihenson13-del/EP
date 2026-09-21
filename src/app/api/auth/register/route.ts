import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { isAdminEmail } from "@/lib/admin-emails"
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit"
import { registerSchema } from "@/lib/validations/auth"
import { createEmailVerificationToken } from "@/lib/tokens"
import { sendEmail } from "@/lib/mailer"
import { verifyEmailTemplate } from "@/lib/email-templates"

export async function POST(req: Request) {
  const limited = await rateLimit(`register:ip:${clientIp(req.headers)}`, 10, 60 * 60)
  if (!limited.ok) return NextResponse.json({ error: waitMessage(limited.retryAfterSec) }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  // Sign-up does not prove the person owns the address, so on production nobody becomes admin here: admin
  // emails are promoted when they sign in with Google, which has verified them. Local development keeps the shortcut.
  const isBootstrapAdmin = process.env.NODE_ENV !== "production" && isAdminEmail(email)

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: isBootstrapAdmin ? "ADMIN" : "USER",
    },
  })

  const token = await createEmailVerificationToken(email)
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  const emailResult = await sendEmail({
    to: email,
    subject: "Verify your Events Partner account",
    html: verifyEmailTemplate(name, url),
  })

  return NextResponse.json({ ok: true, userId: user.id, emailMock: emailResult.mock })
}
