import { Link } from "react-router"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  inverted?: boolean
}

/** `inverted` uses light text for dark backgrounds. */
export function Logo({ className, inverted }: LogoProps) {
  return (
    <Link
      to="/"
      aria-label="SmartPresence home"
      className={cn(
        "group inline-flex items-baseline font-logo text-[1.9rem] leading-none font-bold tracking-tight select-none",
        className
      )}
    >
      <span className={cn("transition-colors", inverted ? "text-white" : "text-foreground")}>Smart</span>
      <span className="relative text-primary">
        Presence
        <svg
          aria-hidden="true"
          viewBox="0 0 120 10"
          preserveAspectRatio="none"
          className="absolute -bottom-1.5 left-0 h-2 w-full text-primary/60 transition-all duration-500 [stroke-dasharray:140] [stroke-dashoffset:140] group-hover:[stroke-dashoffset:0]"
        >
          <path d="M2 7 C 30 2, 70 2, 118 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    </Link>
  )
}
