import { createHash } from "crypto"

export type ErrorSource = "server" | "client"

/** Removes anything in a path that could be a secret: long codes (RSVP tokens, ids), query strings and hashes. */
export function sanitizePath(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null
  const clean = path.split(/[?#]/)[0].slice(0, 300)
  return clean
    .split("/")
    // RSVP tokens and ids are long codes without dashes; readable slugs like "yves-rene-turns-1-lt2lf" stay.
    .map((segment) => (/^[A-Za-z0-9_]{16,}$/.test(segment) || (segment.length >= 16 && (segment.match(/\d/g) ?? []).length >= 5) || /^EP1\./.test(segment) ? ":code" : segment))
    .join("/")
}

/** Normalises a message so the "same" error groups together (numbers and quoted values vary between occurrences). */
export function fingerprintOf(source: ErrorSource, message: string, path: string | null): string {
  const shape = message
    .split("\n")[0]
    .replace(/[0-9a-f]{8,}/gi, "#")
    .replace(/\d+/g, "#")
    .replace(/"[^"]{0,200}"|'[^']{0,200}'/g, "…")
    .slice(0, 300)
  return createHash("sha256").update(`${source}|${path ?? ""}|${shape}`).digest("hex").slice(0, 40)
}
