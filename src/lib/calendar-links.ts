function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

export function googleCalendarUrl(opts: { title: string; description?: string; location?: string; start: Date; end: Date }): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${formatICSDate(opts.start)}/${formatICSDate(opts.end)}`,
    details: opts.description ?? "",
    location: opts.location ?? "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarUrl(opts: { title: string; description?: string; location?: string; start: Date; end: Date }): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: opts.title,
    startdt: opts.start.toISOString(),
    enddt: opts.end.toISOString(),
    body: opts.description ?? "",
    location: opts.location ?? "",
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function icsFileContent(opts: { title: string; description?: string; location?: string; start: Date; end: Date; uid: string }): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Events Partner//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(opts.start)}`,
    `DTEND:${formatICSDate(opts.end)}`,
    `SUMMARY:${opts.title}`,
    `DESCRIPTION:${(opts.description ?? "").replace(/\n/g, "\\n")}`,
    `LOCATION:${opts.location ?? ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}
