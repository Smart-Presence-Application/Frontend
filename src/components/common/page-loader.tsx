import { LoaderCircle } from "lucide-react"

export function PageLoader() {
  return (
    <div role="status" className="flex min-h-[60dvh] items-center justify-center text-primary">
      <LoaderCircle className="size-8 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

/** Reserves space for a lazily loaded landing section so anchors and layout stay stable. */
export function SectionSkeleton({ className = "min-h-[600px]" }: { className?: string }) {
  return (
    <div className={`container-page flex items-center justify-center py-24 ${className}`} aria-hidden="true">
      <div className="h-2 w-24 animate-pulse rounded-full bg-muted" />
    </div>
  )
}
