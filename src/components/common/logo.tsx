import { Link } from "react-router"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  /** Always use the white wordmark, for dark backgrounds in either theme. */
  inverted?: boolean
  /** Wraps the wordmark in a link home; off where it is part of a heading. */
  link?: boolean
}

/** The SmartPresence wordmark: black in the light theme, white in the dark one. Size it with a height class. */
export function Logo({ className, inverted, link = true }: LogoProps) {
  const img = "h-full w-auto select-none"
  const wordmark = (
    <>
      {!inverted && <img src="/brand/smartpresence-logo.png" alt="" width={1200} height={214} draggable={false} className={cn(img, "dark:hidden")} />}
      <img
        src="/brand/smartpresence-logo-white.png"
        alt=""
        width={1200}
        height={214}
        draggable={false}
        className={cn(img, !inverted && "hidden dark:block")}
      />
      <svg
        aria-hidden
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="logo-underline pointer-events-none absolute top-[108%] left-[14%] h-[28%] w-[84%] overflow-visible text-primary"
      >
        <path
          d="M2 9 C 60 2, 140 2, 198 8"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  )
  const classes = cn("group relative inline-flex h-8 shrink-0 items-center", className)
  if (!link) {
    return (
      <span role="img" aria-label="SmartPresence" className={classes}>
        {wordmark}
      </span>
    )
  }
  return (
    <Link to="/" aria-label="SmartPresence home" className={classes}>
      {wordmark}
    </Link>
  )
}

interface LogoMarkProps {
  className?: string
  /** Wraps the mark in a link home; off where it sits inside another control. */
  link?: boolean
}

/** The square logo mark, for spaces too tight for the wordmark (mobile, collapsed sidebar). */
export function LogoMark({ className, link = true }: LogoMarkProps) {
  const size = cn("size-10 shrink-0", className)
  const img = (
    <img
      src="/icons/icon-192.png"
      alt={link ? "" : "SmartPresence"}
      width={192}
      height={192}
      draggable={false}
      className={cn("select-none", link ? "size-full" : size)}
    />
  )
  if (!link) return img
  return (
    <Link to="/" aria-label="SmartPresence home" className={cn("inline-flex", size)}>
      {img}
    </Link>
  )
}
