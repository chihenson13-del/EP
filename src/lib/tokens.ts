import { randomBytes } from "crypto"
import { db } from "@/lib/db"

const HOUR = 60 * 60 * 1000

export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

export async function createEmailVerificationToken(email: string) {
  await db.verificationToken.deleteMany({ where: { identifier: email } })
  const token = generateToken()
  const expires = new Date(Date.now() + 24 * HOUR)
  await db.verificationToken.create({ data: { identifier: email, token, expires } })
  return token
}

export async function consumeEmailVerificationToken(email: string, token: string) {
  const record = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  })
  if (!record || record.expires < new Date()) return false
  await db.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } })
  return true
}

export async function createPasswordResetToken(userId: string) {
  await db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } })
  const token = generateToken()
  const expires = new Date(Date.now() + HOUR)
  await db.passwordResetToken.create({ data: { userId, token, expires } })
  return token
}

export async function consumePasswordResetToken(token: string) {
  const record = await db.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.usedAt || record.expires < new Date()) return null
  await db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  return record
}
