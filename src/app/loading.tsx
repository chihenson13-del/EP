import { LogoMark } from "@/components/brand/logo"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LogoMark className="size-14 animate-pulse" />
    </div>
  )
}
