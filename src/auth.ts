import NextAuth, { CredentialsSignin } from "next-auth"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { rateLimit, clearRateLimit, clientIp } from "@/lib/rate-limit"

const PROFILE_REFRESH_MS = 5 * 60 * 1000

/** Surfaced to the login page as result.code so it can say "too many attempts" instead of "wrong password". */
class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts"
}

const providers: Provider[] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const email = credentials?.email as string | undefined
      const password = credentials?.password as string | undefined
      if (!email || !password) return null

      // Brute-force protection: per network address and per account, before any password hashing happens.
      const emailKey = `login:email:${email.toLowerCase()}`
      const [byIp, byEmail] = await Promise.all([
        rateLimit(`login:ip:${clientIp(request.headers)}`, 40, 10 * 60),
        rateLimit(emailKey, 10, 10 * 60),
      ])
      if (!byIp.ok || !byEmail.ok) throw new TooManyAttempts()

      const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
      if (!user?.passwordHash) return null

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) return null
      await clearRateLimit(emailKey) // a correct sign-in wipes earlier typos

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        emailVerified: user.emailVerified,
      }
    },
  }),
]

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
    newUser: "/dashboard",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // OAuth sign-ins are treated as pre-verified since the provider already verified the email.
      if (account?.provider !== "credentials" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email } })
        if (existing && !existing.emailVerified) {
          await db.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } })
        }
        if (
          process.env.ADMIN_BOOTSTRAP_EMAIL &&
          user.email.toLowerCase() === process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase() &&
          existing &&
          existing.role !== "ADMIN"
        ) {
          await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } })
        }
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role?: string }).role ?? "USER"
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null
        token.refreshedAt = Date.now()
      }
      // Profile fields are re-read from the database when the session is explicitly updated, or at most
      // every PROFILE_REFRESH_MS otherwise. Previously this ran a query on EVERY request, which added a
      // full database round trip in front of every page and server action. Admin authorisation does not
      // rely on this cache: requireAdmin() re-reads the role from the database.
      const stale = typeof token.refreshedAt !== "number" || Date.now() - token.refreshedAt > PROFILE_REFRESH_MS
      if (trigger === "update" || (!user && token.id && stale)) {
        token.refreshedAt = Date.now()
        const dbUser = await db.user.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          token.role = dbUser.role
          token.emailVerified = dbUser.emailVerified
          token.name = dbUser.name
          token.picture = dbUser.image
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? "USER"
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null
      }
      return session
    },
  },
})
