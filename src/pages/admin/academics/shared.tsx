import type { ReactNode } from "react"
import { CalendarPlus, CircleAlert, CircleCheck, MoreHorizontal, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { EmptyState } from "@/components/admin/states"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface RowAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
  hidden?: boolean
}

/** Kebab menu for a table row; destructive actions are grouped last after a separator. */
export function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const visible = actions.filter((a) => !a.hidden)
  const normal = visible.filter((a) => !a.destructive)
  const danger = visible.filter((a) => a.destructive)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {normal.map(({ label: text, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={text} onSelect={onSelect}>
            <Icon /> {text}
          </DropdownMenuItem>
        ))}
        {normal.length > 0 && danger.length > 0 && <DropdownMenuSeparator />}
        {danger.map(({ label: text, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={text} variant="destructive" onSelect={onSelect}>
            <Icon /> {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Pushes toolbar actions to the right on wide screens; full width when the toolbar stacks. */
export function ToolbarActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 sm:ml-auto [&>button]:flex-1 sm:[&>button]:flex-none">{children}</div>
}

/** Shown on year-based tabs when the school has no academic year yet. */
export function NoYearsState({ onCreateYear }: { onCreateYear: () => void }) {
  return (
    <EmptyState
      icon={CalendarPlus}
      title="No academic years yet"
      description="Create an academic year for this school first. Class sections, holidays and working days all belong to a year."
      action={
        <Button onClick={onCreateYear}>
          <CalendarPlus /> Go to academic years
        </Button>
      }
    />
  )
}

export interface BulkRow {
  key: string | number
  label: string
  message?: string
}

/** Outcome of a bulk create: what was created and what failed with the reason. */
export function BulkOutcome({ created, failed, noun }: { created: BulkRow[]; failed: BulkRow[]; noun: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <SummaryTile icon={CircleCheck} label="Created" value={created.length} tone="ok" />
        <SummaryTile icon={CircleAlert} label="Failed" value={failed.length} tone={failed.length ? "bad" : "muted"} />
      </div>

      {created.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Created {noun}</p>
          <div className="flex flex-wrap gap-1.5">
            {created.map((row, i) => (
              <motion.span
                key={row.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary ring-1 ring-primary/20 ring-inset"
              >
                <CircleCheck className="size-3.5" /> {row.label}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Not created</p>
          <ul className="grid gap-1.5">
            {failed.map((row) => (
              <li
                key={row.key}
                className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span className="min-w-0">
                  <span className="font-medium">{row.label}</span>
                  {row.message && <span className="block text-xs text-muted-foreground">{row.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

export function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = "muted",
}: {
  icon: LucideIcon
  label: string
  value: number
  tone?: "ok" | "bad" | "muted"
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone === "ok" && "bg-primary/10 text-primary",
          tone === "bad" && "bg-destructive/10 text-destructive",
          tone === "muted" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

/** Calendar-page style date tile used in the holiday and working-day tables. */
export function DateTile({ date, className }: { date: string; className?: string }) {
  const d = new Date(`${date}T00:00:00`)
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 leading-none text-primary",
        className
      )}
    >
      <span className="text-[0.65rem] font-semibold uppercase">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
      <span className="text-base font-bold tabular-nums">{d.getDate()}</span>
    </span>
  )
}
