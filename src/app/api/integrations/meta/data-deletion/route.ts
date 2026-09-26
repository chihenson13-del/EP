import { NextResponse } from "next/server"
import { getMetaConfig } from "@/lib/messenger/config"
import { parseSignedRequest } from "@/lib/messenger/crypto"
import { deleteMetaUserData } from "@/lib/messenger/meta-messenger-service"

export const dynamic = "force-dynamic"

/**
 * Meta Data Deletion Request Callback. Meta POSTs a form field `signed_request` (verified with the app secret);
 * we delete that Facebook user's Meta connection data and answer { url, confirmation_code } as Meta documents.
 */
export async function POST(req: Request) {
  const status = getMetaConfig()
  if (!status.live) return new NextResponse("Not found", { status: 404 })

  const form = await req.formData().catch(() => null)
  const signed = form?.get("signed_request")
  if (typeof signed !== "string" || signed.length > 5000) return NextResponse.json({ error: "Missing signed_request" }, { status: 400 })

  const data = parseSignedRequest(signed, status.config.appSecret)
  const metaUserId = typeof data?.user_id === "string" ? data.user_id : null
  if (!metaUserId) return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 })

  const code = await deleteMetaUserData(metaUserId)
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  return NextResponse.json({ url: `${base}/meta/data-deletion?code=${code}`, confirmation_code: code })
}
