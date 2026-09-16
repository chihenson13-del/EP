"use client"

import { useState } from "react"
import { toast } from "sonner"
import { X, RefreshCw, Plus } from "lucide-react"
import { generateInvitationContent } from "@/actions/ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AiGenerateOutput } from "@/lib/ai-generator"
import type { EventType } from "@prisma/client"

export function AiGeneratorPanel({ eventId, eventType, onInsert, onClose }: { eventId: string; eventType: EventType; onInsert: (text: string) => void; onClose: () => void }) {
  const [hostName, setHostName] = useState("")
  const [venueName, setVenueName] = useState("")
  const [tone, setTone] = useState<"warm" | "formal" | "playful" | "modern">("warm")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiGenerateOutput | null>(null)

  async function generate() {
    setLoading(true)
    const res = await generateInvitationContent(eventId, { eventType, hostName, venueName, tone, additionalInfo })
    setLoading(false)
    if (!res.ok) return toast.error(res.error)
    setResult(res.data)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">AI Invitation Generator</p>
        <Button size="icon" variant="ghost" className="size-7" onClick={onClose}><X className="size-4" /></Button>
      </div>

      <div className="space-y-2">
        <Input placeholder="Host / celebrant name" value={hostName} onChange={(e) => setHostName(e.target.value)} />
        <Input placeholder="Venue" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
        <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="playful">Playful</SelectItem>
            <SelectItem value="modern">Modern</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Anything else to mention? (optional)" rows={2} value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} />
        <Button size="sm" className="w-full" onClick={generate} disabled={loading}>
          <RefreshCw className="size-3.5" /> {loading ? "Generating..." : result ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          <GeneratedField label="Headline" text={result.headline} onInsert={onInsert} />
          <GeneratedField label="Description" text={result.description} onInsert={onInsert} />
          <GeneratedField label="Welcome message" text={result.welcomeMessage} onInsert={onInsert} />
          <GeneratedField label="RSVP wording" text={result.rsvpWording} onInsert={onInsert} />
          <GeneratedField label="Reminder wording" text={result.reminderWording} onInsert={onInsert} />
          {result.faqSuggestions.map((f, i) => (
            <GeneratedField key={i} label={`FAQ: ${f.q}`} text={f.a} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  )
}

function GeneratedField({ label, text, onInsert }: { label: string; text: string; onInsert: (text: string) => void }) {
  return (
    <div className="rounded-lg border p-2.5 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{text}</p>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onInsert(text)}><Plus className="size-3" /> Insert into design</Button>
    </div>
  )
}
