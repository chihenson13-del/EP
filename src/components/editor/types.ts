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
  fontFamily?: string
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
