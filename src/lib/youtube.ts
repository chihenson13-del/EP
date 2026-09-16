/**
 * Extracts an 11-character YouTube video ID from any common URL shape:
 *   https://www.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   https://music.youtube.com/watch?v=ID
 * Returns null if the URL isn't recognized as a YouTube video link.
 */
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, "")
  const isYoutubeHost = ["youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)
  if (!isYoutubeHost) return null

  const idPattern = /^[a-zA-Z0-9_-]{11}$/

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0]
    return idPattern.test(id) ? id : null
  }

  if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
    const id = url.pathname.split("/")[2]
    return id && idPattern.test(id) ? id : null
  }

  const vParam = url.searchParams.get("v")
  if (vParam && idPattern.test(vParam)) return vParam

  return null
}

export function isValidYoutubeUrl(input: string): boolean {
  return extractYoutubeVideoId(input) !== null
}
