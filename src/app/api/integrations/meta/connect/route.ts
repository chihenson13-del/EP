import { NextResponse } from "next/server"
import { requireUser } from "@/lib/session"
import { getMetaConfig, META_SCOPES } from "@/lib/messenger/config"
import { canUseMessenger } from "@/lib/messenger/meta-messenger-service"
import { createState, STATE_COOKIE, STATE_COOKIE_PATH, STATE_MAX_AGE_SEC } from "@/lib/messenger/oauth-state"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const SETTINGS = "/dashboard/settings/integrations"

/** "Connect Meta": starts Meta's official OAuth dialog. Never asks for a Facebook password. */
export async function GET(req: Request) {
  const user = await requireUser()
  const back = (status: string) => NextResponse.redirect(new URL(`${SETTINGS}?meta=${status}`, req.url))

  const status = getMetaConfig()
  if (!status.live || !(await canUseMessenger(user.id, null))) return back("unavailable")
  const limited = await rateLimit(`meta-connect:${user.id}`, 10, 600)
  if (!limited.ok) return back("rate_limited")

  const { config } = status
  const { state, nonce } = createState(user.id)
  const dialog = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`)
  dialog.searchParams.set("client_id", config.appId)
  dialog.searchParams.set("redirect_uri", config.redirectUri)
  dialog.searchParams.set("state", state)
  dialog.searchParams.set("response_type", "code")
  if (config.loginConfigId) dialog.searchParams.set("config_id", config.loginConfigId)
  else dialog.searchParams.set("scope", META_SCOPES.join(","))

  const res = NextResponse.redirect(dialog)
  res.cookies.set(STATE_COOKIE, nonce, { httpOnly: true, secure: true, sameSite: "lax", path: STATE_COOKIE_PATH, maxAge: STATE_MAX_AGE_SEC })
  return res
}
