"use server"

import { requireUser } from "@/lib/session"
import { requireEventAccess } from "@/lib/event-access"
import { hasFeature, FEATURES } from "@/lib/entitlements"
import { generateInvitationCopy, type AiGenerateInput, type AiGenerateOutput } from "@/lib/ai-generator"
import type { ActionResult } from "@/actions/events"

export async function generateInvitationContent(eventId: string, input: AiGenerateInput): Promise<ActionResult<AiGenerateOutput>> {
  const user = await requireUser()
  await requireEventAccess(user.id, eventId).catch(() => { throw new Error("NO_ACCESS") })

  const allowed = await hasFeature(user.id, eventId, FEATURES.AI_GENERATOR)
  if (!allowed) return { ok: false, error: "The AI invitation generator requires Premium or higher." }

  const output = await generateInvitationCopy(input)
  return { ok: true, data: output }
}
