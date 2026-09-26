import assert from "node:assert/strict"
import { isSafeImageUrl, safeHttpUrl, isHttpUrl } from "../src/lib/image-url"
import { csvCell, toCsv } from "../src/lib/csv"
import { escapeHtml, messageBodyToHtml, invitationTemplate } from "../src/lib/email-templates"
import { updateEventSchema } from "../src/lib/validations/event"
import { submitPurchaseSchema } from "../src/lib/validations/payment"
import { sanitizeCanvas } from "../src/lib/design-canvas"
import { formatDate, formatDateTime, calendarDayOf, singaporeLocalToInstant, appNow, APP_TIMEZONE } from "../src/lib/timezone"
import { randomBytes } from "node:crypto"
import sharp from "sharp"
import { shrinkDataUrl, shrinkCanvasObjects, SHRINK_ABOVE_BYTES } from "../src/lib/shrink-image"
import { isAdminEmail, effectiveRole } from "../src/lib/admin-emails"
import { normalizeFacebookUrl } from "../src/lib/facebook"
import { encryptSecret, decryptSecret, isValidMetaSignature, parseSignedRequest, hmacHex } from "../src/lib/messenger/crypto"
import { buildOptInRef, parseOptInRef } from "../src/lib/messenger/optin"
import { createState, verifyState } from "../src/lib/messenger/oauth-state"
import { getMetaConfig } from "../src/lib/messenger/config"
import { createHmac } from "crypto"
import { withDesignImageUrls } from "../src/lib/design-images"
import { parseTimeLabel, getEventWindow, windowsOverlap, getBookingStatus } from "../src/lib/booking-calendar"

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name) }

t("javascript: URL is rejected as map link", () => assert.equal(isHttpUrl("javascript:alert(1)"), false))
t("safeHttpUrl strips non-http", () => assert.equal(safeHttpUrl("javascript:alert(1)"), null))
t("safeHttpUrl keeps https", () => assert.equal(safeHttpUrl(" https://maps.google.com/?q=x "), "https://maps.google.com/?q=x"))
t("svg data URL rejected as image", () => assert.equal(isSafeImageUrl("data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pg=="), false))
t("html data URL rejected as image", () => assert.equal(isSafeImageUrl("data:text/html;base64,PGh0bWw+"), false))
t("png data URL accepted", () => assert.equal(isSafeImageUrl("data:image/png;base64,iVBORw0KGgo="), true))
t("oversized data URL rejected", () => assert.equal(isSafeImageUrl("data:image/png;base64," + "A".repeat(7_000_001)), false))
t("event schema rejects javascript: mapUrl", () => {
  const r = updateEventSchema.safeParse({ eventId: "x", name: "Test event", type: "PARTY", mapUrl: "javascript:alert(1)" })
  assert.equal(r.success, false)
})
t("event schema accepts https + empty mapUrl", () => {
  assert.equal(updateEventSchema.safeParse({ eventId: "x", name: "Test event", type: "PARTY", mapUrl: "https://goo.gl/maps/abc" }).success, true)
  assert.equal(updateEventSchema.safeParse({ eventId: "x", name: "Test event", type: "PARTY", mapUrl: "" }).success, true)
  assert.equal(updateEventSchema.safeParse({ eventId: "x", name: "Test event", type: "PARTY" }).success, true)
})
t("payment schema rejects non-image proof", () => {
  assert.equal(submitPurchaseSchema.safeParse({ planKey: "PREMIUM", eventId: "e", paymentReference: "R1", paymentMethod: "GCash", proofImageUrl: "javascript:alert(1)" }).success, false)
  assert.equal(submitPurchaseSchema.safeParse({ planKey: "PREMIUM", eventId: "e", paymentReference: "R1", paymentMethod: "GCash", proofImageUrl: "" }).success, true)
  assert.equal(submitPurchaseSchema.safeParse({ planKey: "PREMIUM", eventId: "e", paymentReference: "R1", paymentMethod: "GCash", proofImageUrl: "data:image/jpeg;base64,/9j/4AAQ" }).success, true)
})
t("csv formula injection is neutralised", () => {
  assert.equal(csvCell("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"")
  assert.equal(csvCell("+1234"), "'+1234")
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)")
  assert.equal(csvCell(5), "5")
  assert.equal(csvCell("plain"), "plain")
  assert.equal(toCsv([["a", "b,c"], [1, "d\"e"]]), 'a,"b,c"\n1,"d""e"')
})
t("escapeHtml escapes markup", () => assert.equal(escapeHtml(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;"))
t("message body is escaped and newlines kept", () => assert.equal(messageBodyToHtml("<b>hi</b>\nyo"), "&lt;b&gt;hi&lt;/b&gt;<br/>yo"))
t("invitation email escapes guest/event names", () => {
  const html = invitationTemplate({ guestName: "<script>x</script>", eventName: "<b>Party</b>", rsvpUrl: "https://a.b/?x=1&y=\"2" })
  assert.ok(!html.includes("<script>x</script>"))
  assert.ok(!html.includes("<b>Party</b>"))
  assert.ok(html.includes("&lt;script&gt;"))
})
t("time parsing", () => {
  assert.deepEqual(parseTimeLabel("2:00 PM"), { hours: 14, minutes: 0 })
  assert.deepEqual(parseTimeLabel("12 AM"), { hours: 0, minutes: 0 })
  assert.deepEqual(parseTimeLabel("14:30"), { hours: 14, minutes: 30 })
  assert.equal(parseTimeLabel("TBD"), null)
  assert.equal(parseTimeLabel("25:00"), null)
})
t("conflict overlap logic", () => {
  const d = new Date("2027-01-10T00:00:00Z")
  const a = getEventWindow({ date: d, endDate: null, timeLabel: "3:00 PM" })!
  const b = getEventWindow({ date: d, endDate: null, timeLabel: "4:00 PM" })!
  const c = getEventWindow({ date: d, endDate: null, timeLabel: "9:00 AM" })!
  assert.equal(windowsOverlap(a, b), true)
  assert.equal(windowsOverlap(a, c), false)
})
t("booking status derivation", () => {
  const future = new Date(Date.now() + 86400000 * 5), past = new Date(Date.now() - 86400000 * 5)
  assert.equal(getBookingStatus({ status: "PUBLISHED", date: future }), "CONFIRMED")
  assert.equal(getBookingStatus({ status: "PUBLISHED", date: past }), "COMPLETED")
  assert.equal(getBookingStatus({ status: "DRAFT", date: future }), "PENDING")
  assert.equal(getBookingStatus({ status: "ARCHIVED", date: future }), "CANCELLED")
})
t("design canvas: unknown object types are dropped, numbers clamped", () => {
  const r = sanitizeCanvas({ objects: [
    { id: "a", type: "text", x: 1e12, y: -1e12, width: 100, height: 40, rotation: 9999, zIndex: 0, text: "Hi", fontSize: 24 },
    { id: "b", type: "script", x: 0, y: 0, width: 1, height: 1, rotation: 0, zIndex: 1 },
  ] })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.objects.length, 1)
    assert.equal(r.data.objects[0].x, 20000)
    assert.equal(r.data.objects[0].rotation, 360)
  }
})
t("design canvas: unsafe image sources and non-colours are refused", () => {
  assert.equal(sanitizeCanvas({ objects: [{ id: "i", type: "image", x: 0, y: 0, width: 10, height: 10, rotation: 0, zIndex: 0, src: "javascript:alert(1)" }] }).ok, false)
  assert.equal(sanitizeCanvas({ objects: [{ id: "i", type: "image", x: 0, y: 0, width: 10, height: 10, rotation: 0, zIndex: 0, src: "data:image/svg+xml;base64,PHN2Zz4=" }] }).ok, false)
  const r = sanitizeCanvas({ objects: [{ id: "r", type: "rect", x: 0, y: 0, width: 10, height: 10, rotation: 0, zIndex: 0, fill: "red; background:url(x)" }] })
  assert.equal(r.ok && r.data.objects[0].fill, undefined)
  assert.equal(sanitizeCanvas({ objects: "nope" }).ok, false)
  assert.equal(sanitizeCanvas({ objects: Array.from({ length: 201 }, (_, i) => ({ id: String(i), type: "rect" })) }).ok, false)
})
t("timezone: dates and times render in Asia/Singapore whatever the process timezone is", () => {
  // 2027-03-14 20:00 UTC is already 04:00 on the 15th in Singapore.
  assert.equal(formatDate("2027-03-14T20:00:00Z", { year: "numeric", month: "2-digit", day: "2-digit" }), "03/15/2027")
  assert.equal(formatDateTime("2027-03-14T20:00:00Z", { hour: "numeric", minute: "2-digit", hour12: false }), "04:00")
})
t("timezone: a host-picked date (stored as UTC midnight) is the same calendar day for every viewer", () => {
  const d = calendarDayOf("2027-03-14T00:00:00.000Z")
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate()], [2027, 2, 14])
})
t("timezone: datetime-local input is read as Singapore time, not the viewer's", () => {
  assert.equal(singaporeLocalToInstant("2027-03-14T16:00").toISOString(), "2027-03-14T08:00:00.000Z")
})
t("timezone: appNow reads Singapore wall-clock time", () => {
  const now = appNow()
  const sg = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, hourCycle: "h23", hour: "numeric" }).format(new Date())
  assert.equal(now.getHours(), Number(sg))
})
t("design images: data-URL pictures become versioned media URLs, everything else is untouched", () => {
  const updatedAt = new Date("2027-01-01T00:00:00Z")
  const big = "data:image/png;base64," + "A".repeat(1000)
  const event = {
    id: "ev1",
    design: {
      updatedAt,
      canvasJson: { objects: [
        { id: "a b", type: "image", src: big, x: 1 },
        { id: "c", type: "image", src: "https://cdn.example.com/x.png" },
        { id: "d", type: "text", text: "hi", src: big },
        { id: "e", type: "rect" },
      ] },
    },
  }
  const out = withDesignImageUrls(event)!
  const objs = (out.design!.canvasJson as { objects: Record<string, unknown>[] }).objects
  assert.equal(objs[0].src, `/api/media/design/ev1?o=a%20b&v=${updatedAt.getTime()}`)
  assert.equal(objs[0].x, 1)
  assert.equal(objs[1].src, "https://cdn.example.com/x.png")
  assert.equal(objs[2].src, big) // only image objects are rewritten
  assert.equal(objs[3].type, "rect")
  assert.equal((event.design.canvasJson.objects[0] as { src: string }).src, big) // the stored data is never mutated
  assert.equal(withDesignImageUrls(null), null)
  assert.equal(withDesignImageUrls({ id: "x", design: null })!.design, null)
})
t("admin emails: matches either variable, any case, comma lists, and never an empty value", () => {
  const before = [process.env.ADMIN_BOOTSTRAP_EMAIL, process.env.ADMIN_EMAILS]
  process.env.ADMIN_BOOTSTRAP_EMAIL = "Owner@Example.com"
  process.env.ADMIN_EMAILS = " a@x.com , B@X.com "
  assert.equal(isAdminEmail("owner@example.com"), true)
  assert.equal(isAdminEmail("b@x.com"), true)
  assert.equal(isAdminEmail("c@x.com"), false)
  assert.equal(isAdminEmail(""), false)
  assert.equal(isAdminEmail(null), false)
  delete process.env.ADMIN_BOOTSTRAP_EMAIL
  delete process.env.ADMIN_EMAILS
  assert.equal(isAdminEmail("owner@example.com"), false)
  assert.equal(isAdminEmail(""), false)
  if (before[0] !== undefined) process.env.ADMIN_BOOTSTRAP_EMAIL = before[0]
  if (before[1] !== undefined) process.env.ADMIN_EMAILS = before[1]
})
t("admin emails: an ADMIN whose email is off the allowlist is a regular user", () => {
  const before = [process.env.ADMIN_BOOTSTRAP_EMAIL, process.env.ADMIN_EMAILS]
  process.env.ADMIN_BOOTSTRAP_EMAIL = "owner@example.com"
  process.env.ADMIN_EMAILS = ""
  assert.equal(effectiveRole("ADMIN", "Owner@Example.com"), "ADMIN")
  assert.equal(effectiveRole("ADMIN", "former-admin@example.com"), "USER")
  assert.equal(effectiveRole("ADMIN", null), "USER")
  assert.equal(effectiveRole("USER", "owner@example.com"), "USER") // the list alone never grants admin here
  process.env.ADMIN_EMAILS = " , "
  assert.equal(isAdminEmail(" "), false) // blank entries in a comma list never match
  if (before[0] !== undefined) process.env.ADMIN_BOOTSTRAP_EMAIL = before[0]; else delete process.env.ADMIN_BOOTSTRAP_EMAIL
  if (before[1] !== undefined) process.env.ADMIN_EMAILS = before[1]; else delete process.env.ADMIN_EMAILS
})
t("facebook links: only https facebook.com / m.facebook.com / m.me profile links are kept", () => {
  assert.equal(normalizeFacebookUrl("https://facebook.com/janedoe"), "https://facebook.com/janedoe")
  assert.equal(normalizeFacebookUrl("facebook.com/jane.doe/"), "https://facebook.com/jane.doe")
  assert.equal(normalizeFacebookUrl("https://m.facebook.com/jane.doe?ref=x"), "https://m.facebook.com/jane.doe")
  assert.equal(normalizeFacebookUrl("https://m.me/janedoe"), "https://m.me/janedoe")
  assert.equal(normalizeFacebookUrl("https://www.facebook.com/profile.php?id=100012345678"), "https://www.facebook.com/profile.php?id=100012345678")
  for (const bad of ["javascript:alert(1)", "http://facebook.com/jane", "https://evil.com/facebook.com/jane", "https://facebook.com.evil.com/jane",
    "https://user:pw@facebook.com/jane", "https://facebook.com/", "https://facebook.com/l.php?u=https://evil.com", "https://m.me/a/b", "", null]) {
    assert.equal(normalizeFacebookUrl(bad), null, String(bad))
  }
})
t("messenger: tokens round-trip through AES-GCM and tampering is rejected", () => {
  const key = randomBytes(32)
  const box = encryptSecret("EAAB-page-token", key)
  assert.notEqual(box.includes("EAAB"), true)
  assert.equal(decryptSecret(box, key), "EAAB-page-token")
  assert.equal(decryptSecret(box, randomBytes(32)), null)
  const parts = box.split(".")
  parts[3] = Buffer.from("tampered").toString("base64url")
  assert.equal(decryptSecret(parts.join("."), key), null)
})
t("messenger: webhook signatures must match the raw body and app secret", () => {
  const body = Buffer.from('{"object":"page","entry":[]}')
  const good = `sha256=${hmacHex("app-secret", body)}`
  assert.equal(isValidMetaSignature(body, good, "app-secret"), true)
  assert.equal(isValidMetaSignature(body, good, "other-secret"), false)
  assert.equal(isValidMetaSignature(Buffer.from('{"object":"page"}'), good, "app-secret"), false)
  assert.equal(isValidMetaSignature(body, null, "app-secret"), false)
})
t("messenger: signed_request (data deletion) is verified before it is trusted", () => {
  const payload = Buffer.from(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "12345" })).toString("base64url")
  const sig = createHmac("sha256", "app-secret").update(payload).digest("base64url")
  assert.equal(parseSignedRequest(`${sig}.${payload}`, "app-secret")?.user_id, "12345")
  assert.equal(parseSignedRequest(`${sig}.${payload}`, "wrong"), null)
  assert.equal(parseSignedRequest("garbage", "app-secret"), null)
})
t("messenger: opt-in refs are alphanumeric, bound to one guest, and can't be forged", () => {
  const before = process.env.AUTH_SECRET
  process.env.AUTH_SECRET = "test-secret"
  const ref = buildOptInRef("cmguest1234567890abc")
  assert.match(ref, /^[a-z0-9]+$/)
  assert.equal(parseOptInRef(ref), "cmguest1234567890abc")
  assert.equal(parseOptInRef(ref.replace("cmguest1234567890abc", "cmguest0000000000abc")), null)
  assert.equal(parseOptInRef("ep123x" + "0".repeat(20)), null)
  const { state, nonce } = createState("user-a")
  assert.equal(verifyState("user-a", state, nonce), true)
  assert.equal(verifyState("user-b", state, nonce), false) // another account can't finish this OAuth flow
  assert.equal(verifyState("user-a", state, "other-nonce"), false)
  assert.equal(verifyState("user-a", null, nonce), false)
  if (before === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = before
})
t("messenger: integration is off unless explicitly enabled AND fully configured", () => {
  const saved = { ...process.env }
  for (const k of Object.keys(process.env)) if (k.startsWith("META_")) delete process.env[k]
  assert.equal(getMetaConfig().live, false)
  Object.assign(process.env, { META_APP_ID: "1", META_APP_SECRET: "s", META_REDIRECT_URI: "https://x.test/cb", META_GRAPH_API_VERSION: "v25.0",
    META_WEBHOOK_VERIFY_TOKEN: "v", META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64") })
  assert.equal(getMetaConfig().live, false) // configured but META_MESSENGER_ENABLED not "true"
  process.env.META_MESSENGER_ENABLED = "true"
  assert.equal(getMetaConfig().live, true)
  process.env.META_TOKEN_ENCRYPTION_KEY = "short"
  assert.equal(getMetaConfig().live, false)
  for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
  Object.assign(process.env, saved)
})
const ta = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("ok -", name) }

async function asyncTests() {
  // A noisy picture is the worst case for PNG (it barely compresses), so it stands in for a big camera photo.
  const noise = randomBytes(1400 * 1400 * 3)
  const bigPng = await sharp(noise, { raw: { width: 1400, height: 1400, channels: 3 } }).png().toBuffer()
  const bigJpeg = await sharp(noise, { raw: { width: 1400, height: 1400, channels: 3 } }).jpeg({ quality: 100 }).toBuffer()
  assert.ok(bigPng.length > SHRINK_ABOVE_BYTES && bigJpeg.length > SHRINK_ABOVE_BYTES)
  const bytesOf = (dataUrl: string) => Buffer.from(dataUrl.split(",")[1], "base64")

  await ta("shrink: a large PNG becomes a smaller, valid, size-capped WebP", async () => {
    const before = "data:image/png;base64," + bigPng.toString("base64")
    const after = await shrinkDataUrl(before)
    assert.ok(after.startsWith("data:image/webp;base64,"))
    assert.ok(after.length < before.length)
    const meta = await sharp(bytesOf(after)).metadata()
    assert.equal(meta.format, "webp")
    assert.ok(Math.max(meta.width!, meta.height!) <= 1600)
  })
  await ta("shrink: a large JPEG stays a JPEG and gets smaller", async () => {
    const before = "data:image/jpeg;base64," + bigJpeg.toString("base64")
    const after = await shrinkDataUrl(before)
    assert.ok(after.startsWith("data:image/jpeg;base64,"))
    assert.ok(after.length < before.length)
  })
  await ta("shrink: small pictures, GIFs, external URLs and unreadable data are returned untouched", async () => {
    const small = "data:image/png;base64," + (await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer()).toString("base64")
    assert.equal(await shrinkDataUrl(small), small)
    const gif = "data:image/gif;base64," + bigPng.toString("base64")
    assert.equal(await shrinkDataUrl(gif), gif)
    assert.equal(await shrinkDataUrl("https://example.com/x.png"), "https://example.com/x.png")
    const broken = "data:image/png;base64," + "A".repeat(600_000)
    assert.equal(await shrinkDataUrl(broken), broken)
  })
  await ta("shrink: only image objects are rewritten, and only when something got smaller", async () => {
    const big = "data:image/png;base64," + bigPng.toString("base64")
    const input = [{ id: "a", type: "image", src: big, x: 3 }, { id: "b", type: "text", src: big }, { id: "c", type: "image", src: "https://example.com/x.png" }]
    const out = await shrinkCanvasObjects(input)
    assert.equal(out.changed, true)
    assert.notEqual(out.objects[0].src, big)
    assert.equal(out.objects[0].x, 3)
    assert.equal(out.objects[1].src, big)
    assert.equal(out.objects[2].src, "https://example.com/x.png")
    assert.equal(input[0].src, big) // the input is never mutated
    const again = await shrinkCanvasObjects(out.objects)
    assert.equal(again.changed, false) // already small: nothing to do the second time
  })
}

asyncTests().then(() => console.log(`\n${n} groups passed`)).catch((error) => { console.error(error); process.exit(1) })
