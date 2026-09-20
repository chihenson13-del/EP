/**
 * Escapes one CSV cell. Besides quoting, it neutralises spreadsheet formula injection: a cell that
 * starts with = + - @ (or a tab/CR) is prefixed with an apostrophe so Excel/Sheets treat it as text.
 */
export function csvCell(value: string | number): string {
  let s = String(value)
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n")
}
