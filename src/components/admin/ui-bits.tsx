import { useEffect, useRef, useState, type ReactNode } from "react"
import { Search, X, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/use-debounce"
import { formatNumber, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const TONES = {
  green: "bg-primary/10 text-primary ring-primary/20",
  gray: "bg-muted text-muted-foreground ring-foreground/10",
  red: "bg-destructive/10 text-destructive ring-destructive/20",
  amber: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400",
  dark: "bg-foreground text-background ring-foreground",
} as const

export type Tone = keyof typeof TONES

export function Pill({ tone = "gray", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function ActiveBadge({ active, activeLabel = "Active", inactiveLabel = "Inactive" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <Pill tone={active ? "green" : "gray"} dot>
      {active ? activeLabel : inactiveLabel}
    </Pill>
  )
}

export function PersonAvatar({ name, src, className }: { name?: string | null; src?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-9 ring-2 ring-background", className)}>
      {src && <AvatarImage src={src} alt={name ? `Photo of ${name}` : "Profile photo"} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

export function PersonCell({ name, sub, src, to }: { name: string; sub?: ReactNode; src?: string | null; to?: string }) {
  const content = (
    <span className="flex min-w-0 items-center gap-3">
      <PersonAvatar name={name} src={src} />
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", to && "group-hover:text-primary")}>{name}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
    </span>
  )
  return to ? (
    <Link to={to} className="group" onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  ) : (
    content
  )
}

interface StatCardProps {
  label: string
  value?: number | string
  icon: LucideIcon
  hint?: ReactNode
  loading?: boolean
  to?: string
  index?: number
  tone?: "green" | "dark"
}

export function StatCard({ label, value, icon: Icon, hint, loading, to, index = 0, tone = "green" }: StatCardProps) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-lg hover:shadow-primary/5",
        tone === "dark" && "border-transparent bg-foreground text-background"
      )}
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 size-28 rounded-full bg-primary/10 blur-2xl transition-transform duration-500 group-hover:scale-150"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", tone === "dark" ? "text-background/70" : "text-muted-foreground")}>{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">
              {typeof value === "number" ? formatNumber(value) : (value ?? "-")}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
            tone === "dark" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      {hint && <div className={cn("relative mt-3 text-xs", tone === "dark" ? "text-background/70" : "text-muted-foreground")}>{hint}</div>}
    </motion.div>
  )
  return to ? (
    <Link to={to} className="block rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}

/**
 * Search box that debounces typing before reporting the value. It follows outside
 * changes (e.g. "Clear filters") without fighting the user's typing, and reports only
 * when the debounced text settles; refs keep that from re-firing on outside changes.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [text, setText] = useState(value)
  const debounced = useDebounce(text)

  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(value)
  }

  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })
  useEffect(() => {
    if (debounced !== latest.current.value) latest.current.onChange(debounced)
  }, [debounced])

  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

interface Option {
  value: string
  label: string
}

const ALL = "__all__"

/** Select with an "All" choice that maps to an empty value (no filter). */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  allLabel = "All",
  className,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  allLabel?: string
  className?: string
  label: string
}) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger aria-label={label} className={cn("h-9 w-full sm:w-40", className)}>
        <SelectValue placeholder={placeholder ?? label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
          {error}
        </motion.p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

/** Card that holds a toolbar, a table and a footer. */
export function Panel({ toolbar, children, footer, className }: { toolbar?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn("overflow-hidden rounded-2xl border bg-card shadow-xs", className)}
    >
      {toolbar && <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">{toolbar}</div>}
      {children}
      {footer}
    </motion.section>
  )
}

export function DetailRow({ label, children, icon: Icon }: { label: string; children: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium break-words">{children || "-"}</div>
      </div>
    </div>
  )
}

export function ClearFiltersButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="h-9 text-muted-foreground">
      <X /> Clear
    </Button>
  )
}
