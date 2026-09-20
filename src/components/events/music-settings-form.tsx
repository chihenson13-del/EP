"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Music2, Volume2 } from "lucide-react"
import { updateEventMusic } from "@/actions/music"
import { extractYoutubeVideoId } from "@/lib/youtube"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"

import { safe } from "@/lib/safe-action"
type MusicEvent = {
  id: string
  musicEnabled: boolean
  musicYoutubeUrl: string | null
  musicYoutubeVideoId: string | null
  musicTitle: string | null
  musicAutoplay: boolean
  musicStartMuted: boolean
  musicLoop: boolean
  musicVolume: number
  musicShowControl: boolean
  musicShowPlayer: boolean
}

export function MusicSettingsForm({ event }: { event: MusicEvent }) {
  const [enabled, setEnabled] = useState(event.musicEnabled)
  const [youtubeUrl, setYoutubeUrl] = useState(event.musicYoutubeUrl ?? "")
  const [musicTitle, setMusicTitle] = useState(event.musicTitle ?? "")
  const [autoplay, setAutoplay] = useState(event.musicAutoplay)
  const [startMuted, setStartMuted] = useState(event.musicStartMuted)
  const [loop, setLoop] = useState(event.musicLoop)
  const [volume, setVolume] = useState(event.musicVolume)
  const [showControl, setShowControl] = useState(event.musicShowControl)
  const [showPlayer, setShowPlayer] = useState(event.musicShowPlayer)
  const [saving, setSaving] = useState(false)

  const videoId = useMemo(() => (youtubeUrl.trim() ? extractYoutubeVideoId(youtubeUrl) : null), [youtubeUrl])
  const urlLooksInvalid = youtubeUrl.trim().length > 0 && !videoId

  async function save() {
    if (enabled && !videoId) {
      toast.error("Please enter a valid YouTube URL.")
      return
    }
    setSaving(true)
    const result = await safe(updateEventMusic({
      eventId: event.id,
      musicEnabled: enabled,
      youtubeUrl,
      musicTitle,
      autoplay,
      startMuted,
      loop,
      volume,
      showControl,
      showPlayer,
    }))
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Music settings saved.")
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Music2 className="size-4 text-primary" />
          <div>
            <Label className="text-sm">Enable background music</Label>
            <p className="text-xs text-muted-foreground">Play music from a YouTube link on your event page.</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          <div className="space-y-1.5">
            <Label className="text-sm">YouTube Music URL</Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              aria-invalid={urlLooksInvalid}
            />
            {urlLooksInvalid && <p className="text-xs text-destructive">Please enter a valid YouTube URL.</p>}
            <p className="text-xs text-muted-foreground">Paste a youtube.com/watch, youtu.be, or YouTube Shorts link.</p>
          </div>

          {videoId && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Preview</p>
                <div className="aspect-video w-full overflow-hidden rounded-lg border">
                  <iframe
                    key={videoId}
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                    title="Music preview"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Music title (optional)</Label>
            <Input placeholder="e.g. Perfect — Ed Sheeran" value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} />
            <p className="text-xs text-muted-foreground">Shown next to the music control on your event page.</p>
          </div>

          <ToggleRow label="Autoplay music" description="Attempt to play automatically when a guest opens the invitation." checked={autoplay} onChange={setAutoplay} />
          {autoplay && (
            <ToggleRow
              label="Start muted"
              description="Recommended — browsers reliably allow autoplay only when muted. Guests can unmute with one tap."
              checked={startMuted}
              onChange={setStartMuted}
            />
          )}
          <ToggleRow label="Loop music" description="Restart automatically when the track ends." checked={loop} onChange={setLoop} />
          <ToggleRow label="Show music control to guests" description="A small floating control guests can use to play, pause, or mute." checked={showControl} onChange={setShowControl} />
          <ToggleRow label="Show video player" description="Off by default — music plays discreetly without a visible video." checked={showPlayer} onChange={setShowPlayer} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-1.5"><Volume2 className="size-3.5" /> Volume</Label>
              <span className="text-xs text-muted-foreground">{volume}%</span>
            </div>
            <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={100} step={5} />
          </div>
        </>
      )}

      <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save music settings"}</Button>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-4">
      <div>
        <Label className="text-sm font-normal">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
