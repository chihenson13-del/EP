import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Optimistic gate for signed-in areas: a request with no Auth.js session cookie is redirected to the login
 * page with a real 307 before any page code (or database query) runs. This is a fast first line only —
 * the cookie's presence proves nothing, so every page and action still validates the session itself
 * (requireUser / requireAdmin / getEventContext).
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"]

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => SESSION_COOKIES.some((name) => c.name === name || c.name.startsWith(`${name}.`)))
}

export function proxy(request: NextRequest) {
  if (hasSessionCookie(request)) return NextResponse.next()

  const login = new URL("/login", request.url)
  login.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/checkout/:path*", "/print/:path*", "/preview/:path*"],
}
