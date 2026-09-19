export type ParsedIcsEvent = {
  uid: string
  title: string
  description: string | null
  location: string | null
  startAt: Date
  endAt: Date | null
  allDay: boolean
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "")
}

function parseIcsDate(value: string): { date: Date; allDay: boolean } | null {
  const clean = value.trim()
  const dateOnly = clean.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    return { date: new Date(Number(y), Number(m) - 1, Number(d)), allDay: true }
  }
  const dateTime = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (dateTime) {
    const [, y, mo, d, h, mi, s, z] = dateTime
    if (z) {
      return { date: new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))), allDay: false }
    }
    return { date: new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)), allDay: false }
  }
  return null
}

function unescapeIcsText(text: string): string {
  return text.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\")
}

/** Minimal RFC5545 VEVENT parser — extracts UID/SUMMARY/DESCRIPTION/LOCATION/DTSTART/DTEND. */
export function parseIcsEvents(icsText: string): ParsedIcsEvent[] {
  const unfolded = unfoldIcs(icsText)
  const lines = unfolded.split(/\r\n|\n/)
  const events: ParsedIcsEvent[] = []
  let current: (Partial<ParsedIcsEvent> & { allDay?: boolean }) | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === "BEGIN:VEVENT") {
      current = {}
      continue
    }
    if (line === "END:VEVENT") {
      if (current?.uid && current.title && current.startAt) {
        events.push({
          uid: current.uid,
          title: current.title,
          description: current.description ?? null,
          location: current.location ?? null,
          startAt: current.startAt,
          endAt: current.endAt ?? null,
          allDay: current.allDay ?? false,
        })
      }
      current = null
      continue
    }
    if (!current) continue

    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue
    const rawKey = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1)
    const key = rawKey.split(";")[0].toUpperCase()

    if (key === "UID") current.uid = value.trim()
    else if (key === "SUMMARY") current.title = unescapeIcsText(value)
    else if (key === "DESCRIPTION") current.description = unescapeIcsText(value)
    else if (key === "LOCATION") current.location = unescapeIcsText(value)
    else if (key === "DTSTART") {
      const parsed = parseIcsDate(value)
      if (parsed) {
        current.startAt = parsed.date
        current.allDay = parsed.allDay
      }
    } else if (key === "DTEND") {
      const parsed = parseIcsDate(value)
      if (parsed) current.endAt = parsed.date
    }
  }
  return events
}
