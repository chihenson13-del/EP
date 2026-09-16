"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <div className="print:hidden mb-4 flex justify-end">
      <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
    </div>
  )
}
