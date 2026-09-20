"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { upsertCustomQuestion, deleteCustomQuestion } from "@/actions/guests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { safe } from "@/lib/safe-action"
import { useSingleFlight } from "@/lib/use-single-flight"
type QuestionType = "YES_NO" | "MULTIPLE_CHOICE" | "CHECKBOX" | "DROPDOWN" | "SHORT_TEXT" | "LONG_TEXT" | "NUMBER"

type Question = {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options: string[] | null
}

const TYPE_LABELS: Record<QuestionType, string> = {
  YES_NO: "Yes / No",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOX: "Checkboxes",
  DROPDOWN: "Dropdown",
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
}

const HAS_OPTIONS: QuestionType[] = ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"]

export function QuestionsBuilder({ eventId, questions }: { eventId: string; questions: Question[] }) {
  const [list, setList] = useState(questions)
  const [pending, startTransition] = useTransition()

  const once = useSingleFlight()
  function addQuestion() {
    setList((prev) => [...prev, { id: `new-${Date.now()}`, label: "", type: "SHORT_TEXT", required: false, options: null }])
  }

  function updateLocal(id: string, patch: Partial<Question>) {
    setList((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  function save(question: Question) {
    if (!question.label.trim()) {
      toast.error("Give the question some text first.")
      return
    }
    startTransition(async () => {
      await once(async () => {
      const result = await safe(upsertCustomQuestion(eventId, {
        id: question.id.startsWith("new-") ? undefined : question.id,
        label: question.label,
        type: question.type,
        required: question.required,
        options: question.options ?? undefined,
      }))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Question saved.")
      if (question.id.startsWith("new-")) {
        setList((prev) => prev.map((q) => (q.id === question.id ? { ...q, id: result.data.id } : q)))
      }
    })
    })
  }

  function remove(id: string) {
    if (id.startsWith("new-")) {
      setList((prev) => prev.filter((q) => q.id !== id))
      return
    }
    startTransition(async () => {
      const result = await safe(deleteCustomQuestion(eventId, id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => prev.filter((q) => q.id !== id))
    })
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {list.map((q) => (
        <Card key={q.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="size-4 text-muted-foreground mt-2.5 shrink-0" />
              <Input placeholder="Question text" value={q.label} onChange={(e) => updateLocal(q.id, { label: e.target.value })} />
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => remove(q.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pl-6">
              <Select value={q.type} onValueChange={(v) => updateLocal(q.id, { type: v as QuestionType, options: HAS_OPTIONS.includes(v as QuestionType) ? (q.options ?? [""]) : null })}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={q.required} onCheckedChange={(c) => updateLocal(q.id, { required: c })} /> Required
              </label>
              <Button size="sm" onClick={() => save(q)} disabled={pending}>Save</Button>
            </div>
            {HAS_OPTIONS.includes(q.type) && (
              <div className="pl-6 space-y-2">
                {(q.options ?? [""]).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...(q.options ?? [""])]
                        next[i] = e.target.value
                        updateLocal(q.id, { options: next })
                      }}
                    />
                    <Button variant="ghost" size="icon" onClick={() => updateLocal(q.id, { options: (q.options ?? []).filter((_, idx) => idx !== i) })}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => updateLocal(q.id, { options: [...(q.options ?? []), ""] })}>
                  <Plus className="size-3.5" /> Add option
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addQuestion}><Plus className="size-4" /> Add question</Button>
    </div>
  )
}
