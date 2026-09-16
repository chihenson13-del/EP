import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

const providers: Provider[] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined
      const password = credentials?.password as string | undefined
      if (!email || !password) return null

      const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
      if (!user?.passwordHash) return null

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) return null

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

if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
  providers.push(
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
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
      }
      if (trigger === "update" || (!user && token.id)) {
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
