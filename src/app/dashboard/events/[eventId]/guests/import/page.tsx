"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { UploadCloud } from "lucide-react"
import { importGuests } from "@/actions/guests"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { safe } from "@/lib/safe-action"
const TARGET_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "category", label: "Category", required: false },
] as const

type TargetKey = (typeof TARGET_FIELDS)[number]["key"]

export default function ImportGuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<TargetKey, string>>({ firstName: "", lastName: "", email: "", phone: "", category: "" })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  function handleFile(file: File) {
    const name = file.name.toLowerCase()
    if (!/\.(csv|xlsx|xls)$/.test(name)) {
      toast.error("Please choose a .csv, .xlsx or .xls file.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That file is too large. Please keep guest imports under 5MB.")
      return
    }
    if (name.endsWith(".csv")) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => applyParsed(res.meta.fields ?? [], res.data),
        error: () => toast.error("Couldn't read that CSV file."),
      })
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "binary" })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })
          const fields = json.length ? Object.keys(json[0]) : []
          applyParsed(fields, json)
        } catch {
          toast.error("Couldn't read that spreadsheet. Save it as .xlsx or .csv and try again.")
        }
      }
      reader.onerror = () => toast.error("Couldn't read that file.")
      reader.readAsBinaryString(file)
    }
  }

  function applyParsed(fields: string[], data: Record<string, string>[]) {
    setHeaders(fields)
    setRows(data)
    const guess: Record<TargetKey, string> = { firstName: "", lastName: "", email: "", phone: "", category: "" }
    for (const field of fields) {
      const norm = field.toLowerCase().replace(/[^a-z]/g, "")
      if (norm.includes("first")) guess.firstName = field
      else if (norm.includes("last")) guess.lastName = field
      else if (norm.includes("email")) guess.email = field
      else if (norm.includes("phone") || norm.includes("mobile")) guess.phone = field
      else if (norm.includes("categ") || norm.includes("group")) guess.category = field
    }
    setMapping(guess)
    setResult(null)
  }

  async function handleImport() {
    if (!mapping.firstName) {
      toast.error("Map a column to First Name before importing.")
      return
    }
    setImporting(true)
    const mapped = rows.map((r) => ({
      firstName: r[mapping.firstName] ?? "",
      lastName: mapping.lastName ? r[mapping.lastName] : undefined,
      email: mapping.email ? r[mapping.email] : undefined,
      phone: mapping.phone ? r[mapping.phone] : undefined,
      category: mapping.category ? r[mapping.category] : undefined,
    }))
    const res = await safe(importGuests(eventId, mapped))
    setImporting(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setResult(res.data)
    toast.success(`Imported ${res.data.imported} guest(s).`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Import guests</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a CSV or Excel file, map the columns, then import.</p>
      </div>

      {!headers.length ? (
        <Card>
          <CardContent className="p-10">
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-12 cursor-pointer hover:bg-secondary/40 transition-colors">
              <UploadCloud className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">Click to choose a .csv or .xlsx file</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map columns</CardTitle>
              <CardDescription>Match each field to a column from your file.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {TARGET_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-sm font-medium">{f.label}{f.required && <span className="text-destructive"> *</span>}</label>
                  <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Not mapped" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not mapped</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview ({rows.length} rows)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{TARGET_FIELDS.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      {TARGET_FIELDS.map((f) => <TableCell key={f.key}>{mapping[f.key] ? r[mapping[f.key]] : "—"}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 5 && <p className="text-xs text-muted-foreground mt-2">+ {rows.length - 5} more rows</p>}
            </CardContent>
          </Card>

          {result && (
            <Card className="bg-secondary/40">
              <CardContent className="p-4 text-sm">
                Imported <strong>{result.imported}</strong> guest(s). Skipped <strong>{result.skipped}</strong> (duplicates, invalid rows, or plan limit reached).
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setHeaders([]); setRows([]); setResult(null) }}>Choose a different file</Button>
            <Button onClick={handleImport} disabled={importing}>{importing ? "Importing..." : `Import ${rows.length} guests`}</Button>
            {result && <Button variant="outline" onClick={() => router.push(`/dashboard/events/${eventId}/guests`)}>Done — view guests</Button>}
          </div>
        </>
      )}
    </div>
  )
}
