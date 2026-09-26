import Link from "next/link"
import { THEMES } from "@/lib/themes"
import { getFont } from "@/lib/fonts"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/brand/logo"
import { ArrowRight, Crown } from "lucide-react"

export default function ThemesGalleryPage() {
  const themes = THEMES

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo responsive /></Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-16 pb-10 text-center space-y-4">
        <h1 className="font-heading text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
          Themes for every kind of event
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance">
          Every theme applies your fonts, colors, and layout instantly — pick one to start, then customize it as much as you like.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            const c = theme.colors
            const title = getFont(theme.fonts.title)
            const body = getFont(theme.fonts.body)
            return (
              <Card key={theme.key} className="overflow-hidden border-border/70 shadow-xs p-0">
                <div className="h-36 flex flex-col items-center justify-center gap-2 px-4" style={{ background: c.background, backgroundImage: c.backgroundImage }}>
                  <span className="text-3xl leading-none" style={{ fontFamily: title.cssFamily, color: c.primary }}>Celebrate</span>
                  <span className="text-[11px] uppercase tracking-[0.22em]" style={{ fontFamily: body.cssFamily, color: c.secondary }}>Save the date</span>
                  <span className="px-4 py-1 text-xs font-medium" style={{
                    fontFamily: body.cssFamily,
                    borderRadius: theme.button.shape === "pill" ? 999 : theme.button.shape === "rounded" ? 8 : 0,
                    ...(theme.button.variant === "outline" ? { border: `1px solid ${c.accent}`, color: c.accent } : { background: c.accent, color: c.accentText }),
                  }}>RSVP</span>
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading font-semibold text-lg">{theme.name}</h3>
                    {theme.isPremium && (
                      <Badge variant="outline" className="border-primary/30 text-primary bg-accent/30 shrink-0">
                        <Crown className="size-3" /> Premium
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="font-normal">{theme.category}</Badge>
                  <p className="text-sm text-muted-foreground">{theme.description}</p>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-14">
          <Button size="lg" asChild>
            <Link href="/register">
              Create your first event <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/70 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo textClassName="text-base" markClassName="size-5" />
          <span>© {new Date().getFullYear()} Events Partner. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
