import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireUser } from "@/lib/session"
import { getMetaConfig } from "@/lib/messenger/config"
import { canUseMessenger, completeOAuth } from "@/lib/messenger/meta-messenger-service"
import { STATE_COOKIE, STATE_COOKIE_PATH, verifyState } from "@/lib/messenger/oauth-state"

export const dynamic = "force-dynamic"

const SETTINGS = "/dashboard/settings/integrations"

/**
 * Meta redirects here after the OAuth dialog. Checks the state (CSRF + same user), exchanges the code on the
 * server, and stores only encrypted tokens. The code and tokens never appear in any page or redirect we send.
 */
export async function GET(req: Request) {
  const user = await requireUser()
  const url = new URL(req.url)
  const jar = await cookies()
  const nonce = jar.get(STATE_COOKIE)?.value

  const done = (status: string) => {
    const res = NextResponse.redirect(new URL(`${SETTINGS}?meta=${status}`, req.url))
    res.cookies.set(STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: STATE_COOKIE_PATH, maxAge: 0 })
    return res
  }

  if (!getMetaConfig().live || !(await canUseMessenger(user.id, null))) return done("unavailable")
  if (!verifyState(user.id, url.searchParams.get("state"), nonce)) return done("invalid_state")
  if (url.searchParams.get("error")) return done("cancelled")

  const code = url.searchParams.get("code")
  if (!code || code.length > 2000) return done("error")

  const result = await completeOAuth(user.id, code)
  if (!result.ok) return done("error")
  if (result.pageCount === 0) return done("no_pages")
  return done(result.pageCount === 1 ? "connected" : "choose_page")
}
