"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Volume2, VolumeX } from "lucide-react"

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string
          width?: string | number
          height?: string | number
          playerVars?: Record<string, string | number>
          events?: {
            onReady?: (e: { target: YTPlayer }) => void
            onStateChange?: (e: { data: number; target: YTPlayer }) => void
            onError?: (e: { data: number }) => void
          }
        }
      ) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; UNSTARTED: number; CUED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  setVolume: (v: number) => void
  getPlayerState: () => number
  destroy: () => void
}

let apiLoadPromise: Promise<void> | null = null
function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise
  apiLoadPromise = new Promise((resolve) => {
    const existingCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.()
      resolve()
    }
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    document.head.appendChild(script)
  })
  return apiLoadPromise
}

export type MusicConfig = {
  videoId: string
  title: string | null
  autoplay: boolean
  startMuted: boolean
  loop: boolean
  volume: number
  showControl: boolean
  showPlayer: boolean
}

export function MusicPlayer({ config }: { config: MusicConfig }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(config.startMuted)
  const [needsGesture, setNeedsGesture] = useState(config.autoplay)
  const [error, setError] = useState(false)
  // The YouTube player (a heavy third-party embed) is only created when it's actually needed: right away
  // when autoplay or a visible player was requested, otherwise on the guest's first tap on the control.
  const [activated, setActivated] = useState(config.autoplay || config.showPlayer)
  const playOnReady = useRef(false)

  useEffect(() => {
    if (!activated) return
    let cancelled = false
    let checkTimer: ReturnType<typeof setTimeout> | null = null
    let idleHandle: number | null = null
    const container = containerRef.current

    const start = () => loadYoutubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return
      const mount = document.createElement("div")
      containerRef.current.replaceChildren(mount)

      const startMuted = config.autoplay ? true : config.startMuted
      const player = new window.YT.Player(mount, {
        videoId: config.videoId,
        // Fill the container (a 16:9 box when the player is visible) instead of the embed's fixed 640x360.
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: config.autoplay ? 1 : 0,
          mute: startMuted ? 1 : 0,
          loop: config.loop ? 1 : 0,
          playlist: config.loop ? config.videoId : undefined,
          controls: config.showPlayer ? 1 : 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        } as Record<string, string | number>,
        events: {
          onReady: (e) => {
            if (cancelled) return
            playerRef.current = e.target
            e.target.setVolume(config.volume)
            setReady(true)

            if (playOnReady.current) {
              // The guest tapped play before the player existed — this is that tap's playback.
              playOnReady.current = false
              e.target.unMute()
              setMuted(false)
              e.target.playVideo()
              setPlaying(true)
              setNeedsGesture(false)
            } else if (config.autoplay) {
              e.target.playVideo()
              // If the creator wants sound (not "start muted"), try to unmute shortly after —
              // most browsers allow this once a muted autoplay has already started.
              checkTimer = setTimeout(() => {
                if (cancelled) return
                const state = e.target.getPlayerState()
                const isPlaying = state === window.YT?.PlayerState.PLAYING
                setPlaying(!!isPlaying)
                if (isPlaying) {
                  setNeedsGesture(false)
                  if (!config.startMuted) {
                    e.target.unMute()
                    setMuted(false)
                    // Browsers may refuse the unmute without a gesture: show the real state, not the hoped-for one.
                    setTimeout(() => {
                      if (!cancelled) setMuted(e.target.isMuted())
                    }, 500)
                  } else {
                    setMuted(true)
                  }
                } else {
                  // Autoplay was blocked entirely — wait for a guest tap.
                  setNeedsGesture(true)
                }
              }, 800)
            } else {
              setNeedsGesture(false)
            }
          },
          onStateChange: (e) => {
            if (window.YT) setPlaying(e.data === window.YT.PlayerState.PLAYING)
          },
          onError: () => {
            setError(true)
          },
        },
      })
      playerRef.current = player
    })

    // Yield to the browser first so the invitation itself paints before the embed's scripts load.
    if (typeof window.requestIdleCallback === "function") idleHandle = window.requestIdleCallback(() => void start(), { timeout: 1500 })
    else checkTimer = setTimeout(() => void start(), 300)

    return () => {
      cancelled = true
      if (checkTimer) clearTimeout(checkTimer)
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle)
      playerRef.current?.destroy()
      playerRef.current = null
      container?.replaceChildren()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.videoId, activated])

  /** First tap on the control when the player hasn't been created yet: create it and start playing. */
  function handleFirstTap() {
    playOnReady.current = true
    setActivated(true)
    setPlaying(true)
    setNeedsGesture(false)
  }

  function handleTogglePlay() {
    const player = playerRef.current
    if (!player) return
    if (playing) {
      player.pauseVideo()
      setPlaying(false)
    } else {
      player.playVideo()
      setPlaying(true)
      setNeedsGesture(false)
    }
  }

  function handleToggleMute() {
    const player = playerRef.current
    if (!player) return
    if (muted) {
      player.unMute()
      setMuted(false)
    } else {
      player.mute()
      setMuted(true)
    }
  }

  /**
   * The "Play Music" fallback when the browser blocked autoplay. This tap is a real user gesture, so it may
   * start playback WITH sound — honour the host's "start muted" setting rather than the (muted) state the
   * blocked autoplay attempt left behind.
   */
  function handleGestureStart() {
    const player = playerRef.current
    if (!player) return
    if (config.startMuted) {
      player.mute()
      setMuted(true)
    } else {
      player.unMute()
      setMuted(false)
    }
    player.setVolume(config.volume)
    player.playVideo()
    setPlaying(true)
    setNeedsGesture(false)
  }

  if (error) return null

  return (
    <>
      <div
        ref={containerRef}
        className={config.showPlayer ? "fixed bottom-20 right-4 z-40 w-56 aspect-video rounded-xl overflow-hidden shadow-lg border border-border/70 bg-black" : "sr-only"}
        aria-hidden={!config.showPlayer}
      />

      {config.showControl && (ready || !activated) && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-border/70 bg-card/95 backdrop-blur pl-3 pr-1.5 py-1.5 shadow-md hover:shadow-lg transition-shadow">
          <button
            type="button"
            onClick={!activated ? handleFirstTap : needsGesture ? handleGestureStart : handleTogglePlay}
            className="flex items-center gap-2"
            aria-label={playing ? "Pause music" : "Play music"}
          >
            <MusicIndicator playing={playing} />
            <span className="text-sm font-medium text-foreground max-w-[140px] truncate">
              {needsGesture ? "Play Music" : config.title || "Music"}
            </span>
          </button>
          {activated && !needsGesture && (
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          )}
        </div>
      )}
    </>
  )
}

function MusicIndicator({ playing }: { playing: boolean }) {
  if (!playing) return <Play className="size-4 text-primary" />
  return (
    <span className="flex items-end gap-0.5 h-3.5 w-4">
      <span className="w-1 bg-primary rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: "40%", animationDelay: "0ms" }} />
      <span className="w-1 bg-primary rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: "100%", animationDelay: "150ms" }} />
      <span className="w-1 bg-primary rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: "60%", animationDelay: "300ms" }} />
    </span>
  )
}
