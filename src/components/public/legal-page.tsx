import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { LEGAL_UPDATED, SUPPORT_EMAIL } from "@/lib/site"

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Events Partner home">
            <Logo responsive />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </header>
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6 text-[0.95rem] leading-relaxed [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline">
          <div>
            <h1 className="font-heading text-3xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated {LEGAL_UPDATED}</p>
          </div>
          <p>{intro}</p>
          {children}
          <h2>Contact</h2>
          <p>
            {SUPPORT_EMAIL ? (
              <>Questions or requests about this page: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</>
            ) : (
              <>Questions or requests about this page can be sent to the site operator through the email address you signed up with.</>
            )}
          </p>
        </article>
      </main>
      <footer className="border-t border-border/70 py-6 text-sm text-muted-foreground">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
