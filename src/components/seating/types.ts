import type { TableShape, ChairStyle, SeatStatus, FloorObjectType } from "@prisma/client"

export type ChairData = {
  id: string
  seatNumber: number
  x: number
  y: number
  rotation: number
  style: ChairStyle
  status: SeatStatus
  notes: string | null
  guestId: string | null
  guest: { id: string; firstName: string; lastName: string | null } | null
}

export type TableData = {
  id: string
  name: string
  number: number | null
  shape: TableShape
  width: number
  height: number
  x: number
  y: number
  rotation: number
  capacity: number
  color: string
  borderColor: string
  borderWidth: number
  labelVisible: boolean
  seatSpacing: number
  locked: boolean
  chairs: ChairData[]
}

export type FloorObjectData = {
  id: string
  type: FloorObjectType
  label: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
  locked: boolean
}

export type GuestOption = {
  id: string
  firstName: string
  lastName: string | null
  rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED" | "MAYBE"
  chair: { id: string } | null
}

export type Selection = { kind: "table"; id: string } | { kind: "chair"; id: string; tableId: string } | { kind: "object"; id: string } | null
