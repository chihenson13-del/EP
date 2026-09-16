"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ChevronUp, ChevronDown, Trash2, Copy, Eye, EyeOff, Plus } from "lucide-react"
import { updateSectionContent, toggleSectionVisibility, reorderSections, addSection, deleteSection, duplicateSection } from "@/actions/content"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { SectionType } from "@prisma/client"

type Section = { id: string; type: SectionType; order: number; visible: boolean; content: Record<string, unknown> }

const SECTION_LABELS: Record<SectionType, string> = {
  HERO: "Hero", HOST: "Host", COUNTDOWN: "Countdown", VENUE: "Venue", DESCRIPTION: "Description",
  SCHEDULE: "Schedule", GALLERY: "Gallery", RSVP: "RSVP", FAQ: "FAQ", DRESS_CODE: "Dress Code",
  GIFT_INFO: "Gift Info", CUSTOM: "Custom", FOOTER: "Footer",
}

const EDITABLE_TYPES: SectionType[] = ["HERO", "HOST", "DESCRIPTION", "DRESS_CODE", "GIFT_INFO", "CUSTOM", "FOOTER", "FAQ"]

export function WebsiteBuilder({ eventId, sections }: { eventId: string; sections: Section[] }) {
  const [list, setList] = useState(sections)
  const [pending, startTransition] = useTransition()

  function persistOrder(next: Section[]) {
    setList(next)
    startTransition(() => { reorderSections(eventId, next.map((s) => s.id)) })
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...list]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    persistOrder(next)
  }

  function toggleVisible(id: string, visible: boolean) {
    setList((prev) => prev.map((s) => (s.id === id ? { ...s, visible } : s)))
    startTransition(() => { toggleSectionVisibility(eventId, id, visible) })
  }

  function remove(id: string) {
    setList((prev) => prev.filter((s) => s.id !== id))
    startTransition(() => { deleteSection(eventId, id) })
  }

  function duplicate(id: string) {
    startTransition(async () => {
      await duplicateSection(eventId, id)
      toast.success("Section duplicated. Refresh to see it.")
    })
  }

  function addNew(type: SectionType) {
    startTransition(async () => {
      const result = await addSection(eventId, type)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => [...prev, { id: result.data.id, type, order: prev.length, visible: true, content: {} }])
    })
  }

  function saveContent(id: string, content: Record<string, unknown>) {
    setList((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)))
    startTransition(async () => {
      const result = await updateSectionContent(eventId, id, content)
      if (!result.ok) toast.error(result.error)
      else toast.success("Saved.")
    })
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {list.map((section, i) => (
        <Card key={section.id} className={!section.visible ? "opacity-60" : ""}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{SECTION_LABELS[section.type]}</Badge>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="size-7" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => move(i, 1)} disabled={i === list.length - 1}><ChevronDown className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => toggleVisible(section.id, !section.visible)}>
                  {section.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => duplicate(section.id)}><Copy className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(section.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
            {EDITABLE_TYPES.includes(section.type) && (
              <SectionContentEditor section={section} onSave={(content) => saveContent(section.id, content)} disabled={pending} />
            )}
          </CardContent>
        </Card>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline"><Plus className="size-4" /> Add section</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {Object.entries(SECTION_LABELS).map(([type, label]) => (
            <DropdownMenuItem key={type} onClick={() => addNew(type as SectionType)}>{label}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SectionContentEditor({ section, onSave, disabled }: { section: Section; onSave: (content: Record<string, unknown>) => void; disabled: boolean }) {
  const [draft, setDraft] = useState(section.content)

  if (section.type === "HERO") {
    return (
      <div className="space-y-2">
        <Input placeholder="Heading" value={(draft.heading as string) ?? ""} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
        <Input placeholder="Subheading" value={(draft.subheading as string) ?? ""} onChange={(e) => setDraft({ ...draft, subheading: e.target.value })} />
        <Button size="sm" onClick={() => onSave(draft)} disabled={disabled}>Save</Button>
      </div>
    )
  }
  if (section.type === "FAQ") {
    const items = (draft.items as Array<{ q: string; a: string }>) ?? []
    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="space-y-1 border rounded-md p-2">
            <Input placeholder="Question" value={item.q} onChange={(e) => { const next = [...items]; next[i] = { ...item, q: e.target.value }; setDraft({ items: next }) }} />
            <Textarea placeholder="Answer" rows={2} value={item.a} onChange={(e) => { const next = [...items]; next[i] = { ...item, a: e.target.value }; setDraft({ items: next }) }} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDraft({ items: [...items, { q: "", a: "" }] })}>Add question</Button>
          <Button size="sm" onClick={() => onSave(draft)} disabled={disabled}>Save</Button>
        </div>
      </div>
    )
  }
  if (section.type === "CUSTOM") {
    return (
      <div className="space-y-2">
        <Input placeholder="Heading" value={(draft.heading as string) ?? ""} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
        <Textarea placeholder="Body text" value={(draft.text as string) ?? ""} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <Button size="sm" onClick={() => onSave(draft)} disabled={disabled}>Save</Button>
      </div>
    )
  }
  // HOST, DESCRIPTION, DRESS_CODE, GIFT_INFO, FOOTER — simple text field
  return (
    <div className="space-y-2">
      <Textarea placeholder="Text" value={(draft.text as string) ?? ""} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
      <Button size="sm" onClick={() => onSave(draft)} disabled={disabled}>Save</Button>
    </div>
  )
}
