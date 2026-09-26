export type DesignObjectType = "text" | "image" | "rect" | "ellipse"

export type DesignObject = {
  id: string
  type: DesignObjectType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  locked?: boolean
  hidden?: boolean
  // text
  text?: string
  fontSize?: number
  color?: string
  fontWeight?: number
  align?: "left" | "center" | "right"
  /** Legacy free-form family; new designs use fontKey (a FONT_REGISTRY key, always a loaded font). */
  fontFamily?: string
  fontKey?: string
  italic?: boolean
  /** Letter spacing in em (-0.1 … 1) */
  letterSpacing?: number
  /** Line height multiplier (0.8 … 3) */
  lineHeight?: number
  textTransform?: "none" | "uppercase" | "lowercase"
  textShadow?: boolean
  // image
  src?: string
  // shape
  fill?: string
  stroke?: string
  strokeWidth?: number
  rx?: number
}

export type CanvasData = {
  objects: DesignObject[]
}
