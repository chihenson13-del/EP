import Link from "next/link"
import { requireAdmin } from "@/lib/session"
import { Logo } from "@/components/brand/logo"

export const dynamic = "force-dynamic"

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/activity", label: "Activity Log" },
  { href: "/admin/settings", label: "Settings" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <Logo />
            <span className="text-muted-foreground text-sm font-normal">/ Admin</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="px-3 py-2 rounded-md hover:bg-secondary font-medium whitespace-nowrap transition-colors">
                {item.label}
              </Link>
            ))}
            <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-secondary font-medium whitespace-nowrap text-muted-foreground transition-colors">
              Back to app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
