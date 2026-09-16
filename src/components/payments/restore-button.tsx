"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { restorePurchases } from "@/actions/payments"
import { Button } from "@/components/ui/button"

export function RestoreButton() {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleRestore() {
    startTransition(async () => {
      const result = await restorePurchases()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.data.restored > 0 ? `Restored ${result.data.restored} purchase(s).` : "Everything is already up to date.")
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={handleRestore} disabled={pending}>
      <RefreshCw className="size-4" /> {pending ? "Restoring..." : "Restore My Purchases"}
    </Button>
  )
}
