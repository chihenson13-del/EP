import { getEventTypeConfig } from "@/lib/event-types"
import type { EventType } from "@prisma/client"

export type AiGenerateInput = {
  eventType: EventType
  hostName?: string
  date?: string
  timeLabel?: string
  venueName?: string
  tone?: "warm" | "formal" | "playful" | "modern"
  additionalInfo?: string
}

export type AiGenerateOutput = {
  headline: string
  description: string
  welcomeMessage: string
  scheduleWording: string
  rsvpWording: string
  faqSuggestions: Array<{ q: string; a: string }>
  reminderWording: string
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Rule-based invitation copy generator (the "AI generator" Premium feature). Deterministic —
 * no external API calls — so it always produces real output with zero configuration.
 */
export async function generateInvitationCopy(input: AiGenerateInput): Promise<AiGenerateOutput> {
  const typeConfig = getEventTypeConfig(input.eventType)
  const host = input.hostName || typeConfig.hostLabel
  const tone = input.tone ?? "warm"

  const headlineTemplates: Record<string, string[]> = {
    warm: [`You're Invited to ${host}'s ${typeConfig.label}!`, `Join us for a ${typeConfig.label} to remember`, `Celebrate with ${host}`],
    formal: [`You are cordially invited: ${typeConfig.label} hosted by ${host}`, `An invitation to ${host}'s ${typeConfig.label}`],
    playful: [`Let's party! ${host}'s ${typeConfig.label} is coming 🎉`, `${host} says: come celebrate with us!`],
    modern: [`${typeConfig.label}: Save the Date`, `${host} — ${typeConfig.label}`],
  }

  const descriptionTemplates = [
    `We're so excited to celebrate this ${typeConfig.label.toLowerCase()} with the people who matter most. ${input.venueName ? `Join us at ${input.venueName}` : "Join us"}${input.date ? ` on ${input.date}` : ""}${input.timeLabel ? ` at ${input.timeLabel}` : ""} for an unforgettable time together.`,
    `${host} would love for you to be part of this special ${typeConfig.label.toLowerCase()}. ${input.additionalInfo ? input.additionalInfo + " " : ""}Come dressed to celebrate — we can't wait to see you there.`,
  ]

  const welcomeTemplates = [
    `Welcome! We're thrilled to have you join us for this celebration.`,
    `Hi there! Thanks for stopping by — here's everything you need to know.`,
  ]

  const scheduleTemplates = [
    `Here's how the day will unfold — see you at the first item on the list!`,
    `A quick look at our schedule for the day.`,
  ]

  const rsvpTemplates = [
    `Please let us know if you can make it by using the button below — it helps us plan everything just right.`,
    `Kindly RSVP at your earliest convenience so we can prepare for your arrival.`,
  ]

  const reminderTemplates = [
    `Just a friendly reminder — we can't wait to celebrate with you soon!`,
    `The big day is almost here! Don't forget to RSVP if you haven't already.`,
  ]

  const faqSuggestions = buildFaqSuggestions(input.eventType)

  return {
    headline: pick(headlineTemplates[tone] ?? headlineTemplates.warm),
    description: pick(descriptionTemplates),
    welcomeMessage: pick(welcomeTemplates),
    scheduleWording: pick(scheduleTemplates),
    rsvpWording: pick(rsvpTemplates),
    faqSuggestions,
    reminderWording: pick(reminderTemplates),
  }
}

function buildFaqSuggestions(type: EventType): Array<{ q: string; a: string }> {
  const common = [
    { q: "What should I wear?", a: "Smart casual is perfect, but feel free to dress to celebrate!" },
    { q: "Can I bring a plus-one?", a: "Please check your invitation — plus-ones are noted there if allowed." },
  ]
  if (type === "WEDDING") {
    return [...common, { q: "Is there parking available?", a: "Yes, parking is available on-site." }]
  }
  if (type === "KIDS_PARTY" || type === "BIRTHDAY") {
    return [...common, { q: "Are kids welcome?", a: "Absolutely — the more the merrier!" }]
  }
  if (type === "CORPORATE" || type === "CONFERENCE" || type === "SEMINAR") {
    return [{ q: "Is there a dress code?", a: "Business casual is recommended." }, { q: "Will sessions be recorded?", a: "Check with the organizer for recording availability." }]
  }
  return common
}
