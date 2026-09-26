import { toast } from "sonner"

/**
 * Copy text with the Clipboard API, falling back to a hidden textarea for older and in-app browsers.
 * Shows a toast with the result when a success message is given.
 */
export async function copyText(text: string, successMessage?: string): Promise<boolean> {
  let ok = false
  try {
    await navigator.clipboard.writeText(text)
    ok = true
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    try { ok = document.execCommand("copy") } catch { ok = false }
    ta.remove()
  }
  if (successMessage) {
    if (ok) toast.success(successMessage)
    else toast.error(`Couldn't copy automatically. Here's the link: ${text}`)
  }
  return ok
}
