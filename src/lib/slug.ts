import { db } from "@/lib/db"
import { customAlphabet } from "nanoid"

const suffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 5)

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "")
}

export async function uniqueEventSlug(name: string): Promise<string> {
  const base = slugify(name) || "event"
  let candidate = base
  for (let i = 0; i < 8; i++) {
    const existing = await db.event.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
    candidate = `${base}-${suffix()}`
  }
  return `${base}-${suffix()}`
}
