import { db } from "@/lib/db"

export type DisplayPaymentSettings = {
  /** A URL the browser can load: an external link as-is, or the cached media route for an uploaded QR. */
  paymentQrImageUrl: string | null
  paymentAccountName: string | null
  paymentAccountInfo: string | null
  paymentInstructions: string | null
}

/**
 * The manual-payment settings for rendering. An uploaded QR is stored as a multi-megabyte data URL, so it is
 * never read into a page: the query returns NULL for it and the image is addressed via /api/media/qr/default
 * (versioned by updatedAt, so replacing the QR busts the cache).
 */
export async function getDisplayPaymentSettings(): Promise<DisplayPaymentSettings | null> {
  const rows = await db.$queryRaw<
    {
      qr: string | null
      hasQr: boolean
      paymentAccountName: string | null
      paymentAccountInfo: string | null
      paymentInstructions: string | null
      updatedAt: Date
    }[]
  >`
    SELECT CASE WHEN "paymentQrImageUrl" LIKE 'data:%' THEN NULL ELSE "paymentQrImageUrl" END AS qr,
           ("paymentQrImageUrl" IS NOT NULL AND "paymentQrImageUrl" <> '') AS "hasQr",
           "paymentAccountName", "paymentAccountInfo", "paymentInstructions", "updatedAt"
    FROM "PlatformSettings" WHERE id = 'default'`
  const row = rows[0]
  if (!row) return null
  return {
    paymentQrImageUrl: row.qr ?? (row.hasQr ? `/api/media/qr/default?v=${new Date(row.updatedAt).getTime()}` : null),
    paymentAccountName: row.paymentAccountName,
    paymentAccountInfo: row.paymentAccountInfo,
    paymentInstructions: row.paymentInstructions,
  }
}
