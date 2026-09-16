import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="font-heading text-6xl font-bold text-primary">404</p>
      <h1 className="font-heading text-xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground max-w-sm">
        The event, guest, or page you&apos;re looking for doesn&apos;t exist, or you may not have access to it.
      </p>
      <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  )
}
