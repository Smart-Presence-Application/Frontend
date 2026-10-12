import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "motion/react"

import { ErrorState } from "@/components/admin/states"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { calendarApi } from "@/lib/endpoints"
import { formatDate, isoDate } from "@/lib/format"
import type { CalendarDay, DayType } from "@/lib/types"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })

/** Colour and wording for each kind of day; shared by the grid, the legend and the list. */
const DAY_STYLE: Record<DayType, { label: string; cell: string; dot: string }> = {
  WORKING: { label: "Working day", cell: "bg-primary/12 text-primary ring-1 ring-primary/25", dot: "bg-primary" },
  HOLIDAY: { label: "Holiday", cell: "bg-destructive text-white shadow-sm shadow-destructive/25", dot: "bg-destructive" },
  WEEKEND: { label: "Weekend", cell: "bg-slate-500/15 text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
  EVENT: { label: "Event", cell: "bg-amber-500 text-white shadow-sm shadow-amber-500/25", dot: "bg-amber-500" },
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function describe(day: CalendarDay) {
  const kind = DAY_STYLE[day.day_type].label
  const detail = day.title || day.remarks
  return detail ? `${kind}: ${detail}` : kind
}

/**
 * Month view of the school calendar: working days, events, holidays and
 * weekends, with the month's holidays and events listed underneath. "Today" is fixed
 * when the card mounts so it means the same month throughout.
 */
export function SchoolCalendarCard({ className }: { className?: string }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [thisMonth] = useState(() => isoDate(startOfMonth(new Date())))
  const [school, setSchool] = useState<number | null>(null)
  const first = isoDate(month)
  const last = isoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0))

  const query = useQuery({
    queryKey: ["school-calendar", { first, last, school }],
    queryFn: () => calendarApi.get({ date_from: first, date_to: last, school }),
    placeholderData: keepPreviousData,
  })
  const data = query.data
  const byDate = new Map((data?.days ?? []).map((d) => [d.date, d]))
  const highlights = (data?.days ?? []).filter((d) => d.day_type === "HOLIDAY" || d.day_type === "EVENT")
  const counts = (data?.days ?? []).reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.day_type]: (acc[d.day_type] ?? 0) + 1 }), {})

  const shift = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1))
  const isCurrent = first === thisMonth

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const lead = (month.getDay() + 6) % 7
  const today = isoDate()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-primary" /> School calendar
        </CardTitle>
        <CardDescription>
          {data ? `${data.school_name}${data.academic_year ? ` · ${data.academic_year.name}` : ""}` : "Working days, events, holidays and weekends"}
        </CardDescription>
        {data && data.schools.length > 1 && (
          <CardAction>
            <Select value={String(data.school)} onValueChange={(v) => setSchool(Number(v))}>
              <SelectTrigger className="h-8 w-44" aria-label="School">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.schools.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <p className="min-w-36 text-center text-sm font-semibold" aria-live="polite">
            {monthFmt.format(month)}
          </p>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
          {!isCurrent && (
            <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(`${thisMonth}T00:00:00`))}>
              Today
            </Button>
          )}
        </div>

        {query.error && !data ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : (
          <div>
            <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className={cn("grid grid-cols-7 gap-1 transition-opacity", query.isFetching && "opacity-60")}>
              {Array.from({ length: lead }, (_, i) => (
                <span key={`lead-${i}`} aria-hidden="true" />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const date = isoDate(new Date(month.getFullYear(), month.getMonth(), i + 1))
                const day = byDate.get(date)
                if (query.isLoading) return <Skeleton key={date} className="aspect-square rounded-lg" />
                const cell = (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.006, 0.18) }}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-xs font-medium tabular-nums sm:text-sm",
                      day ? DAY_STYLE[day.day_type].cell : "text-muted-foreground",
                      date === today && "ring-2 ring-foreground ring-offset-1 ring-offset-card"
                    )}
                    aria-label={`${formatDate(date)}: ${day ? describe(day) : "not set"}`}
                  >
                    {i + 1}
                  </motion.div>
                )
                return day ? (
                  <Tooltip key={date}>
                    <TooltipTrigger asChild>{cell}</TooltipTrigger>
                    <TooltipContent>{describe(day)}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div key={date}>{cell}</div>
                )
              })}
            </div>
          </div>
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Legend">
          {(Object.keys(DAY_STYLE) as DayType[]).map((type) => (
            <li key={type} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", DAY_STYLE[type].dot)} />
              {DAY_STYLE[type].label}
              {!!counts[type] && <span className="font-medium text-foreground tabular-nums">{counts[type]}</span>}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full ring-1 ring-foreground/20" /> Not set
          </li>
        </ul>

        {highlights.length > 0 && (
          <ul className="grid gap-1.5 border-t pt-3">
            {highlights.map((d) => (
              <li key={d.date} className="flex items-center gap-3 text-sm">
                <span className={cn("size-2 shrink-0 rounded-full", DAY_STYLE[d.day_type].dot)} />
                <span className="w-24 shrink-0 text-muted-foreground tabular-nums">{formatDate(d.date)}</span>
                <span className="min-w-0 truncate">{d.title || d.remarks || DAY_STYLE[d.day_type].label}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
