import Link from "next/link"
import { requireUser } from "@/lib/session"
import { UserMenu } from "@/components/dashboard/user-menu"
import { Logo } from "@/components/brand/logo"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="shrink-0">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-secondary font-medium transition-colors">
              My Events
            </Link>
            <Link href="/dashboard/purchases" className="px-3 py-2 rounded-md hover:bg-secondary font-medium transition-colors">
              Purchases
            </Link>
            <Link href="/dashboard/settings" className="px-3 py-2 rounded-md hover:bg-secondary font-medium transition-colors">
              Settings
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/admin" className="px-3 py-2 rounded-md hover:bg-secondary font-medium text-primary transition-colors">
                Admin
              </Link>
            )}
          </nav>
          <UserMenu user={{ name: user.name ?? "", email: user.email ?? "", image: user.image ?? null }} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
