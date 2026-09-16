import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { getEventAccessRole } from "@/lib/event-access"

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string; tableId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { eventId, tableId } = await params
  const role = await getEventAccessRole(user.id, eventId)
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const table = await db.table.findFirst({
    where: { id: tableId, eventId },
    include: { chairs: { include: { guest: true }, orderBy: { seatNumber: "asc" } } },
  })
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(table)
}
