import NextAuth, { CredentialsSignin } from "next-auth"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { rateLimit, clearRateLimit, clientIp } from "@/lib/rate-limit"
import { isAdminEmail } from "@/lib/admin-emails"

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
      // Google has verified the address, so signing in with it attaches to the existing account with that email
      // instead of failing with "OAuthAccountNotLinked". The signIn callback below first drops any unverified
      // password on that account, so a stranger who pre-registered the address can't keep a way in.
      allowDangerousEmailAccountLinking: true,
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
          // Sign-up never checked this address, so a password set before now can't be trusted: Google has only
          // just proven who owns the mailbox. Drop it; they sign in with Google (or reset the password later).
          await db.user.update({
            where: { id: existing.id },
            data: { emailVerified: new Date(), ...(existing.passwordHash ? { passwordHash: null } : {}) },
          })
        }
      }
      return true
    },
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role?: string }).role ?? "USER"
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null
        token.refreshedAt = Date.now()
        // Admin emails are promoted only when the provider has verified the address (Google), never on a password
        // sign-in. This also covers a brand-new account, which doesn't exist yet when the signIn callback runs.
        if (account && account.provider !== "credentials" && isAdminEmail(user.email) && token.role !== "ADMIN") {
          await db.user.update({ where: { id: user.id as string }, data: { role: "ADMIN" } })
          token.role = "ADMIN"
        }
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
