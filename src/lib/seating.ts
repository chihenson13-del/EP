import type { TableShape, ChairStyle } from "@prisma/client"

export type ShapeDefaults = { width: number; height: number; capacity: number; kind: "round" | "rect" | "oval" | "custom" }

export const TABLE_SHAPE_DEFAULTS: Record<TableShape, ShapeDefaults> = {
  ROUND_SMALL: { width: 70, height: 70, capacity: 4, kind: "round" },
  ROUND_MEDIUM: { width: 100, height: 100, capacity: 8, kind: "round" },
  ROUND_LARGE: { width: 130, height: 130, capacity: 10, kind: "round" },
  RECT_SMALL: { width: 100, height: 60, capacity: 4, kind: "rect" },
  RECT_MEDIUM: { width: 140, height: 70, capacity: 6, kind: "rect" },
  RECT_LARGE: { width: 180, height: 80, capacity: 8, kind: "rect" },
  RECT_LONG: { width: 240, height: 80, capacity: 10, kind: "rect" },
  SQUARE_SMALL: { width: 70, height: 70, capacity: 4, kind: "rect" },
  SQUARE_LARGE: { width: 110, height: 110, capacity: 8, kind: "rect" },
  OVAL_SMALL: { width: 120, height: 70, capacity: 6, kind: "oval" },
  OVAL_LARGE: { width: 180, height: 90, capacity: 10, kind: "oval" },
  BANQUET_LONG: { width: 260, height: 70, capacity: 10, kind: "rect" },
  BANQUET_XLONG: { width: 340, height: 70, capacity: 14, kind: "rect" },
  HALF_CIRCLE: { width: 140, height: 80, capacity: 6, kind: "rect" },
  CRESCENT: { width: 150, height: 80, capacity: 6, kind: "rect" },
  U_SHAPE: { width: 180, height: 140, capacity: 10, kind: "rect" },
  T_SHAPE: { width: 180, height: 140, capacity: 10, kind: "rect" },
  L_SHAPE: { width: 160, height: 160, capacity: 8, kind: "rect" },
  CUSTOM: { width: 120, height: 80, capacity: 6, kind: "custom" },
}

export const SHAPE_LABELS: Record<TableShape, string> = {
  ROUND_SMALL: "Round — Small",
  ROUND_MEDIUM: "Round — Medium",
  ROUND_LARGE: "Round — Large",
  RECT_SMALL: "Rectangle — Small",
  RECT_MEDIUM: "Rectangle — Medium",
  RECT_LARGE: "Rectangle — Large",
  RECT_LONG: "Rectangle — Long",
  SQUARE_SMALL: "Square — Small",
  SQUARE_LARGE: "Square — Large",
  OVAL_SMALL: "Oval — Small",
  OVAL_LARGE: "Oval — Large",
  BANQUET_LONG: "Banquet — Long",
  BANQUET_XLONG: "Banquet — Extra Long",
  HALF_CIRCLE: "Half-circle",
  CRESCENT: "Crescent",
  U_SHAPE: "U-shape",
  T_SHAPE: "T-shape",
  L_SHAPE: "L-shape",
  CUSTOM: "Custom",
}

export const CHAIR_STYLE_LABELS: Record<ChairStyle, string> = {
  STANDARD: "Standard",
  BANQUET: "Banquet",
  ELEGANT: "Elegant",
  MODERN: "Modern",
  OFFICE: "Office",
  CONFERENCE: "Conference",
  STOOL: "Stool",
  LOUNGE: "Lounge",
}

export type ChairPosition = { x: number; y: number; rotation: number }

/** Auto seat placement: relative offsets from the table's center, by shape family. */
export function computeChairLayout(shape: TableShape, width: number, height: number, capacity: number, seatSpacing: number): ChairPosition[] {
  const defaults = TABLE_SHAPE_DEFAULTS[shape]
  const offset = 22 + seatSpacing

  if (shape === "CUSTOM" || capacity <= 0) return []

  if (defaults.kind === "round") {
    const radius = Math.max(width, height) / 2 + offset
    return Array.from({ length: capacity }, (_, i) => {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, rotation: (angle * 180) / Math.PI + 90 }
    })
  }

  if (defaults.kind === "oval") {
    const rx = width / 2 + offset
    const ry = height / 2 + offset
    return Array.from({ length: capacity }, (_, i) => {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2
      return { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry, rotation: (angle * 180) / Math.PI + 90 }
    })
  }

  // Rectangular family (and generic fallback for exotic shapes): distribute along the perimeter.
  const w = width
  const h = height
  const perimeter = 2 * (w + h)
  const positions: ChairPosition[] = []
  for (let i = 0; i < capacity; i++) {
    const dist = (i / capacity) * perimeter
    positions.push(pointOnRectPerimeter(dist, w, h, offset))
  }
  return positions
}

function pointOnRectPerimeter(dist: number, w: number, h: number, offset: number): ChairPosition {
  let d = dist
  if (d < w) return { x: -w / 2 + d, y: -h / 2 - offset, rotation: 180 }
  d -= w
  if (d < h) return { x: w / 2 + offset, y: -h / 2 + d, rotation: 270 }
  d -= h
  if (d < w) return { x: w / 2 - d, y: h / 2 + offset, rotation: 0 }
  d -= w
  return { x: -w / 2 - offset, y: h / 2 - d, rotation: 90 }
}

export const FLOOR_OBJECT_LABELS: Record<string, string> = {
  STAGE: "Stage",
  DANCE_FLOOR: "Dance Floor",
  BUFFET: "Buffet",
  BAR: "Bar",
  REGISTRATION: "Registration",
  ENTRANCE: "Entrance",
  EXIT: "Exit",
  RESTROOM: "Restroom",
  PHOTO_BOOTH: "Photo Booth",
  GIFT_TABLE: "Gift Table",
  DJ_BOOTH: "DJ Booth",
  PODIUM: "Podium",
  BOOTH: "Booth",
  CUSTOM: "Custom Object",
}

export const FLOOR_OBJECT_DEFAULT_SIZE: Record<string, { width: number; height: number }> = {
  STAGE: { width: 200, height: 100 },
  DANCE_FLOOR: { width: 160, height: 160 },
  BUFFET: { width: 160, height: 60 },
  BAR: { width: 140, height: 50 },
  REGISTRATION: { width: 120, height: 50 },
  ENTRANCE: { width: 80, height: 30 },
  EXIT: { width: 80, height: 30 },
  RESTROOM: { width: 60, height: 50 },
  PHOTO_BOOTH: { width: 90, height: 90 },
  GIFT_TABLE: { width: 100, height: 50 },
  DJ_BOOTH: { width: 90, height: 60 },
  PODIUM: { width: 50, height: 40 },
  BOOTH: { width: 100, height: 80 },
  CUSTOM: { width: 100, height: 60 },
}
