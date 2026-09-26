import type { Metadata } from "next"
import Link from "next/link"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Facebook data deletion", robots: { index: false } }

/** Human-readable status page Meta links people to after a data-deletion request (required by Meta). */
export default async function MetaDataDeletionStatusPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  const request = code && /^[a-f0-9]{24}$/.test(code)
    ? await db.metaDataDeletionRequest.findUnique({ where: { confirmationCode: code } }).catch(() => null)
    : null

  return (
    <main className="mx-auto max-w-xl px-6 py-16 space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Facebook data deletion</h1>
      {request ? (
        <>
          <p>Your request <span className="font-mono text-sm">{request.confirmationCode}</span> was received on {request.createdAt.toISOString().slice(0, 10)} and is <strong>completed</strong>.</p>
          <p className="text-muted-foreground text-sm">
            Events Partner deleted the Facebook Page connection and access tokens linked to your Facebook account, and the
            Messenger links between that Page and guests. Guest lists that organizers typed in themselves are not Facebook data and are not affected.
          </p>
        </>
      ) : (
        <p className="text-muted-foreground">
          We couldn&apos;t find that request. If you removed Events Partner from your Facebook settings, the deletion is processed automatically.
          You can also ask us directly — see our <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      )}
    </main>
  )
}
