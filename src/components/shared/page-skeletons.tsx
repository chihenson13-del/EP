import { Skeleton } from "@/components/ui/skeleton"

/** Shown the moment a tap starts a navigation, while the destination's data loads on the server. */
export function ContentSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8" role="status" aria-label="Loading">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </div>
    </div>
  )
}
