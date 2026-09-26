"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, UserRound, ShieldCheck, ArrowRight } from "lucide-react"
import { findInvitation, leaveInvitation, openInvitation, type LookupResult } from "@/actions/rsvp"
import { buttonStyle, type ResolvedTheme } from "@/lib/theme-resolve"
import { RADIUS_PX } from "@/lib/themes"
import { safe } from "@/lib/safe-action"

type Match = { ref: string; name: string; needsVerification: boolean }

/**
 * Guest self-service lookup. Every step runs on the server (findInvitation / openInvitation): only this event's
 * guests are searched, results show a name and an opaque, short-lived reference, and choosing one sets a signed
 * httpOnly session for that single guest. Nothing here can reveal another guest's details.
 */
export function FindInvitation({ slug, theme }: { slug: string; theme: ResolvedTheme }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<Match | null>(null)
  const [verification, setVerification] = useState("")
  const [pending, startTransition] = useTransition()
  const radius = RADIUS_PX[theme.radius]
  const card: React.CSSProperties = { background: theme.colors.surface, color: theme.colors.text, border: `1px solid ${theme.colors.border}`, borderRadius: radius }
  const inputStyle: React.CSSProperties = { borderColor: theme.colors.border, borderRadius: Math.max(8, radius), background: "#fff", color: "#1f1a24" }

  function search(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setVerifying(null)
    startTransition(async () => {
      const res = await safe(findInvitation(slug, query))
      if (!res.ok) { setResult(null); setError(res.error); return }
      setResult(res.data)
    })
  }

  function choose(match: Match, answer?: string) {
    setError(null)
    startTransition(async () => {
      const res = await safe(openInvitation(slug, match.ref, answer))
      if (!res.ok) { setError(res.error); return }
      if (res.data.needsVerification) { setVerifying(match); return }
      router.refresh() // the server now sees the guest session and shows their RSVP form
    })
  }

  return (
    <section className="space-y-4" aria-labelledby="find-heading">
      <div className="p-5 sm:p-6 space-y-4" style={card}>
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.colors.accent }}>Search your name</p>
          <h2 id="find-heading" className="text-[clamp(1.3rem,5.5vw,1.6rem)] font-semibold" style={{ fontFamily: "var(--font-heading)", color: theme.colors.primary }}>Find Your Invitation</h2>
          <p className="text-sm opacity-85">Please search for your name to find your invitation.</p>
        </div>
        <form onSubmit={search} className="space-y-3" role="search">
          <label htmlFor="guest-name" className="sr-only">Your name</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" aria-hidden />
            <input
              id="guest-name" type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your name..." autoComplete="name" enterKeyHint="search" maxLength={80}
              className="w-full min-h-12 border pl-10 pr-3 text-base outline-none focus-visible:ring-2"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={pending || query.trim().length < 2} className="w-full min-h-12 px-5 text-base font-semibold tracking-wide cursor-pointer disabled:opacity-60" style={buttonStyle(theme)}>
            {pending && !verifying ? "Searching…" : "FIND MY INVITATION"}
          </button>
        </form>
        {error && <p role="alert" className="text-sm font-medium text-red-700 text-center">{error}</p>}
      </div>

      {result && !verifying && <Results result={result} theme={theme} card={card} pending={pending} onChoose={(m) => choose(m)} />}

      {verifying && (
        <form className="p-5 sm:p-6 space-y-3" style={card} onSubmit={(e) => { e.preventDefault(); choose(verifying, verification) }}>
          <p className="flex items-center gap-2 font-semibold" style={{ color: theme.colors.primary }}><ShieldCheck className="size-5" style={{ color: theme.colors.accent }} aria-hidden /> Confirm it&apos;s you, {verifying.name}</p>
          <p className="text-sm opacity-85">For your privacy, enter the email address the host has for you, or the last 4 digits of your phone number.</p>
          <label htmlFor="guest-verify" className="sr-only">Email or last 4 digits of your phone</label>
          <input id="guest-verify" value={verification} onChange={(e) => setVerification(e.target.value)} autoComplete="off" maxLength={120}
            placeholder="Email or last 4 phone digits" className="w-full min-h-12 border px-3 text-base outline-none focus-visible:ring-2" style={inputStyle} />
          <button type="submit" disabled={pending || !verification.trim()} className="w-full min-h-12 px-5 text-base font-semibold cursor-pointer disabled:opacity-60" style={buttonStyle(theme)}>
            {pending ? "Checking…" : "CONTINUE"}
          </button>
          <button type="button" onClick={() => { setVerifying(null); setVerification("") }} className="w-full text-sm underline underline-offset-4 opacity-75">Back to results</button>
        </form>
      )}
    </section>
  )
}

function Results({ result, theme, card, pending, onChoose }: { result: LookupResult; theme: ResolvedTheme; card: React.CSSProperties; pending: boolean; onChoose: (m: Match) => void }) {
  if (result.kind === "too-short") return <Notice card={card}>Please type your full first name, or your first and last name.</Notice>
  if (result.kind === "too-broad") return <Notice card={card}>Several invitations match that. Please type your first and last name.</Notice>
  if (result.kind === "none") return <Notice card={card}>We couldn&apos;t find an invitation with that name. Check the spelling, or try your name exactly as the host would have written it.</Notice>

  if (result.matches.length === 1) {
    const m = result.matches[0]
    return (
      <div className="p-5 sm:p-6 space-y-4 text-center" style={card} role="status">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: theme.colors.accent }}>We found your invitation</p>
        <p className="text-[clamp(1.3rem,6vw,1.75rem)] font-semibold break-words" style={{ fontFamily: "var(--font-heading)", color: theme.colors.primary }}>{m.name}</p>
        <p className="opacity-85">You&apos;re invited to this event.</p>
        <button type="button" onClick={() => onChoose(m)} disabled={pending} className="w-full min-h-12 px-5 text-base font-semibold tracking-wide cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2" style={buttonStyle(theme)}>
          {pending ? "Opening…" : <>CONTINUE <ArrowRight className="size-4" aria-hidden /></>}
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 space-y-3" style={card}>
      <p className="font-semibold" style={{ color: theme.colors.primary }}>We found more than one invitation with this name.</p>
      <p className="text-sm opacity-85">Please select your invitation:</p>
      <ul className="space-y-2">
        {result.matches.map((m) => (
          <li key={m.ref}>
            <button type="button" onClick={() => onChoose(m)} disabled={pending}
              className="w-full min-h-12 flex items-center gap-3 border px-4 py-3 text-left cursor-pointer disabled:opacity-60"
              style={{ borderColor: theme.colors.border, borderRadius: Math.max(10, RADIUS_PX[theme.radius]) }}>
              <UserRound className="size-5 shrink-0" style={{ color: theme.colors.accent }} aria-hidden />
              <span className="flex-1 break-words font-medium">{m.name}</span>
              <ArrowRight className="size-4 shrink-0 opacity-60" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs opacity-70">You may be asked to confirm your email or phone to protect everyone&apos;s invitations.</p>
    </div>
  )
}

function Notice({ card, children }: { card: React.CSSProperties; children: React.ReactNode }) {
  return <p className="p-5 text-center text-sm" style={card} role="status">{children}</p>
}

/** "Not you?" — forgets the chosen invitation on this device and goes back to the name search. */
export function NotYou({ slug, firstName }: { slug: string; firstName: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <p className="text-center text-sm">
      Not {firstName}?{" "}
      <button type="button" disabled={pending} className="underline underline-offset-4 cursor-pointer disabled:opacity-60"
        onClick={() => startTransition(async () => { await safe(leaveInvitation(slug)); router.refresh() })}>
        {pending ? "One moment…" : "Search for another name"}
      </button>
    </p>
  )
}
