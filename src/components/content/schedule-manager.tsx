"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { upsertScheduleItem, deleteScheduleItem } from "@/actions/content"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type Item = { id: string; time: string; title: string; description: string | null; location: string | null }

export function ScheduleManager({ eventId, items }: { eventId: string; items: Item[] }) {
  const [list, setList] = useState(items)
  const [pending, startTransition] = useTransition()

  const once = useSingleFlight()
  function addItem() {
    setList((prev) => [...prev, { id: `new-${Date.now()}`, time: "", title: "", description: "", location: "" }])
  }

  function update(id: string, patch: Partial<Item>) {
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function save(item: Item) {
    if (!item.time.trim() || !item.title.trim()) {
      toast.error("Add a time and title first.")
      return
    }
    startTransition(async () => {
      await once(async () => {
      const result = await safe(upsertScheduleItem(eventId, {
        id: item.id.startsWith("new-") ? undefined : item.id,
        time: item.time, title: item.title, description: item.description ?? undefined, location: item.location ?? undefined,
      }))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Saved.")
      if (item.id.startsWith("new-")) setList((prev) => prev.map((i) => (i.id === item.id ? { ...i, id: result.data.id } : i)))
    })
    })
  }

  function remove(id: string) {
    if (id.startsWith("new-")) return setList((prev) => prev.filter((i) => i.id !== id))
    startTransition(async () => {
      const result = await safe(deleteScheduleItem(eventId, id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.filter((i) => i.id !== id))
    })
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {list.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4 space-y-2">
            <div className="grid grid-cols-[100px_1fr_auto] gap-2">
              <Input placeholder="7:00 PM" value={item.time} onChange={(e) => update(item.id, { time: e.target.value })} />
              <Input placeholder="Title (e.g. Dinner)" value={item.title} onChange={(e) => update(item.id, { title: e.target.value })} />
              <Button variant="ghost" size="icon" onClick={() => remove(item.id)}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
            <Input placeholder="Description (optional)" value={item.description ?? ""} onChange={(e) => update(item.id, { description: e.target.value })} />
            <div className="flex items-center gap-2">
              <Input placeholder="Location (optional)" value={item.location ?? ""} onChange={(e) => update(item.id, { location: e.target.value })} />
              <Button size="sm" onClick={() => save(item)} disabled={pending}>Save</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addItem}><Plus className="size-4" /> Add schedule item</Button>
    </div>
  )
}
