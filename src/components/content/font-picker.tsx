"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FONT_FILTERS, FONT_LIST, getFont } from "@/lib/fonts"
import { cn } from "@/lib/utils"

/**
 * Searchable font picker. Only fonts from FONT_REGISTRY are listed, and every one is loaded with next/font, so
 * the preview in each row is the real font and anything picked renders in the editor and the published page.
 */
export function FontPicker({
  value, onChange, label, previewText, disabled, onReset, resetLabel,
}: {
  value: string
  onChange: (key: string) => void
  label: string
  previewText?: string
  disabled?: boolean
  onReset?: () => void
  resetLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const current = getFont(value)

  const fonts = useMemo(() => {
    const match = FONT_FILTERS.find((f) => f.key === filter)?.match ?? (() => true)
    const q = query.trim().toLowerCase()
    return FONT_LIST.filter((f) => match(f) && (!q || f.label.toLowerCase().includes(q)))
  }, [filter, query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="w-full justify-between font-normal h-10" aria-label={`${label}: ${current.label}. Change font`}>
          <span className="truncate text-base" style={{ fontFamily: current.cssFamily }}>{current.label}</span>
          <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,22rem)] p-0" align="start">
        <div className="p-2 space-y-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fonts…" className="pl-8 h-9" aria-label="Search fonts" />
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Font categories">
            {FONT_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", filter === f.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1" role="listbox" aria-label={label}>
          {fonts.length === 0 && <li className="p-3 text-sm text-muted-foreground">No fonts match.</li>}
          {fonts.map((f) => (
            <li key={f.key} role="option" aria-selected={f.key === value}>
              <button
                type="button"
                onClick={() => { onChange(f.key); setOpen(false) }}
                className={cn("w-full flex items-center justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-secondary", f.key === value && "bg-secondary")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-lg leading-tight" style={{ fontFamily: f.cssFamily }}>{previewText || f.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{f.label} · {f.category === "SANS SERIF" ? "Sans Serif" : f.category.charAt(0) + f.category.slice(1).toLowerCase()}</span>
                </span>
                {f.key === value && <Check className="size-4 text-primary shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
        {onReset && (
          <div className="border-t p-1">
            <button type="button" onClick={() => { onReset(); setOpen(false) }} className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary">
              {resetLabel ?? "Use the theme's font"}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
