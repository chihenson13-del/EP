/**
 * Facebook profile links saved on guests. These are organizer-entered contact shortcuts: Events Partner only
 * stores the link and opens it; it never fetches, scrapes or looks anything up on Facebook.
 *
 * Only these hosts are accepted, always over https:
 *   facebook.com, www.facebook.com, m.facebook.com  (profile pages)
 *   m.me                                            (Messenger links)
 * Anything else (other hosts, javascript:/data: URLs, credentials, custom ports, bare domains, Facebook's own
 * utility pages) is rejected, so a saved link can only ever open a Facebook destination.
 */

export const FACEBOOK_URL_ERROR = "Please enter a valid Facebook profile or Messenger link."

const PROFILE_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com"])
const MESSENGER_HOST = "m.me"

/** First path segments that are Facebook utility pages, not someone's profile. */
const RESERVED_PATHS = new Set([
  "login", "login.php", "logout", "home.php", "sharer", "sharer.php", "share", "dialog", "plugins", "tr", "l.php",
  "recover", "help", "policies", "privacy", "settings", "watch", "marketplace", "gaming", "events", "groups", "pages",
  "ads", "business", "notifications", "messages", "friends", "search", "hashtag", "stories", "reel", "reels", "photo", "photo.php",
])

const USERNAME_RE = /^[A-Za-z0-9.\-_]{1,80}$/

/**
 * Returns the cleaned https URL, or null if the input isn't an acceptable Facebook/Messenger link.
 * Accepts input typed without "https://" (e.g. "facebook.com/jane.doe").
 */
export function normalizeFacebookUrl(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim()
  if (!raw || raw.length > 300) return null

  // Only add a scheme when none was typed; any other scheme (javascript:, data:, http:) is rejected below.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }

  if (url.protocol !== "https:") return null
  if (url.username || url.password || url.port) return null
  const host = url.hostname.toLowerCase()

  const segments = url.pathname.split("/").filter(Boolean)
  if (segments.length === 0) return null
  const first = segments[0]

  if (host === MESSENGER_HOST) {
    if (segments.length !== 1 || !USERNAME_RE.test(first)) return null
    return `https://m.me/${first}`
  }

  if (!PROFILE_HOSTS.has(host)) return null

  // Numeric profiles: facebook.com/profile.php?id=1000123
  if (first.toLowerCase() === "profile.php") {
    const id = url.searchParams.get("id")
    if (!id || !/^\d{5,20}$/.test(id)) return null
    return `https://${host}/profile.php?id=${id}`
  }

  // facebook.com/people/Jane-Doe/1000123 style profile links
  if (first.toLowerCase() === "people") {
    if (segments.length < 3 || !segments.slice(1, 3).every((s) => USERNAME_RE.test(decodeURIComponentSafe(s)))) return null
    return `https://${host}/people/${segments[1]}/${segments[2]}`
  }

  if (segments.length !== 1 || RESERVED_PATHS.has(first.toLowerCase()) || !USERNAME_RE.test(first)) return null
  return `https://${host}/${first}`
}

export function isValidFacebookUrl(input: string | null | undefined): boolean {
  return normalizeFacebookUrl(input) !== null
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return ""
  }
}
