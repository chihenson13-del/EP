import Link from "next/link"
import { Logo } from "@/components/brand/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-secondary/40">
      <header className="p-6">
        <Link href="/">
          <Logo textClassName="text-xl" markClassName="size-7" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
