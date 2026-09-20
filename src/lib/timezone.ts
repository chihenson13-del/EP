/**
 * The single timezone the whole product runs in. Every date a person sees, and every "wall clock" time a
 * host types in, is Singapore time (UTC+8, no daylight saving) — regardless of the server's timezone
 * (Vercel functions run in UTC) or the viewer's browser.
 */
export const APP_TIMEZONE = "Asia/Singapore"
/** Fixed locale so the server render and the browser render produce identical text (no hydration drift). */
const APP_LOCALE = "en-US"
const SG_OFFSET = "+08:00"

type DateInput = Date | string | number

/** e.g. "Sunday, March 14, 2027". Pass options to pick the parts, exactly like toLocaleDateString. */
export function formatDate(value: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options })
}

/** e.g. "9/21/2026, 3:04:05 PM" in Singapore time. */
export function formatDateTime(value: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleString(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options })
}

/**
 * Event dates are stored as the calendar day the host picked (midnight UTC = 08:00 in Singapore, the same
 * day). This returns a Date at LOCAL midnight of that calendar day, so day-grid code that uses local-time
 * helpers (date-fns) shows the intended day for every viewer, wherever their browser is.
 */
export function calendarDayOf(value: DateInput): Date {
  const iso = new Date(value).toISOString().slice(0, 10)
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** The current Singapore wall-clock time as a Date whose LOCAL fields read that time (for day-grid code). */
export function appNow(): Date {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(new Date())
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return new Date(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"))
}

/**
 * Interprets a <input type="datetime-local"> value ("2027-03-14T16:00") as Singapore wall-clock time and
 * returns the exact instant. (new Date("2027-03-14T16:00") would read it in the viewer's own timezone.)
 */
export function singaporeLocalToInstant(localValue: string): Date {
  const withSeconds = /T\d{2}:\d{2}$/.test(localValue) ? `${localValue}:00` : localValue
  return new Date(`${withSeconds}${SG_OFFSET}`)
}
