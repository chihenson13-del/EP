import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit"
import { resetPasswordSchema } from "@/lib/validations/auth"
import { consumePasswordResetToken } from "@/lib/tokens"

export async function POST(req: Request) {
  const limited = await rateLimit(`reset:ip:${clientIp(req.headers)}`, 15, 60 * 60)
  if (!limited.ok) return NextResponse.json({ error: waitMessage(limited.retryAfterSec) }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }

  const record = await consumePasswordResetToken(parsed.data.token)
  if (!record) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  await db.user.update({ where: { id: record.userId }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
