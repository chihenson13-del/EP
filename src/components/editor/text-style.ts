import type { CSSProperties } from "react"
import { getFont } from "@/lib/fonts"
import type { DesignObject } from "@/components/editor/types"

/** One text style for a design text element, shared by the editor canvas and the published invitation. */
export function designTextStyle(o: DesignObject): CSSProperties {
  return {
    width: "100%", height: "100%", display: "flex", alignItems: "center",
    justifyContent: o.align === "left" ? "flex-start" : o.align === "right" ? "flex-end" : "center",
    fontSize: o.fontSize ?? 24,
    color: o.color ?? "var(--brand-plum)",
    fontWeight: o.fontWeight ?? 600,
    fontStyle: o.italic ? "italic" : "normal",
    fontFamily: o.fontKey ? getFont(o.fontKey).cssFamily : o.fontFamily ?? "inherit",
    letterSpacing: o.letterSpacing ? `${o.letterSpacing}em` : undefined,
    lineHeight: o.lineHeight ?? 1.2,
    textTransform: o.textTransform && o.textTransform !== "none" ? o.textTransform : undefined,
    textShadow: o.textShadow ? "0 2px 6px rgb(0 0 0 / 0.28)" : undefined,
    textAlign: o.align ?? "center",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    padding: 4,
  }
}
