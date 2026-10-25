import { useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarCheck, CalendarCog, CalendarPlus, CircleCheck, CopyCheck, LoaderCircle, Pencil, Plus, RefreshCw, SkipForward, Trash2 } from "lucide-react"
import { motion } from "motion/react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Pagination } from "@/components/admin/pagination"
import { AcademicYearSelect, useAcademicYears } from "@/components/admin/pickers"
import { EmptyState, FormAlert } from "@/components/admin/states"
import { ClearFiltersButton, Field, FilterSelect, Panel, Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUrlState } from "@/hooks/use-url-state"
import { academicsApi } from "@/lib/endpoints"
import { formatDate } from "@/lib/format"
import type { DayType, WorkingDay } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DAY_TYPES, MONTHS, WEEKDAYS, useYearScope, weekdayOf, useOpenReset } from "./helpers"
import { DateTile, NoYearsState, RowActions, SummaryTile, ToolbarActions } from "./shared"

const INVALIDATE = [["working-days"]]

const TILE_TONE: Record<DayType, string> = {
  WORKING: "",
  HOLIDAY: "bg-destructive/10 text-destructive",
  WEEKEND: "bg-muted text-muted-foreground",
  EVENT: "bg-accent text-accent-foreground",
}

const dayTypeMeta = (t: DayType) => DAY_TYPES.find((d) => d.value === t) ?? DAY_TYPES[0]

export function WorkingDaysTab({ school, onCreateYear }: { school: number; onCreateYear: () => void }) {
  const url = useUrlState()
  const scope = useYearScope(school)
  const [formTarget, setFormTarget] = useState<WorkingDay | "new" | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkingDay | null>(null)
  const [weekendsOpen, setWeekendsOpen] = useState(false)

  const params = {
    academic_year: scope.yearId,
    day_type: url.get("day_type"),
    month: url.get("month"),
    page: url.page,
    page_size: url.pageSize,
    ordering: "date",
  }
  const query = useQuery({
    queryKey: ["working-days", params],
    queryFn: () => academicsApi.workingDays.list(params),
    enabled: !!scope.yearId,
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation((id: number) => academicsApi.workingDays.remove(id), {
    invalidate: INVALIDATE,
    onSuccess: () => setDeleteTarget(null),
  })

  if (!scope.loading && scope.years.length === 0) {
    return (
      <div className="rounded-2xl border bg-card">
        <NoYearsState onCreateYear={onCreateYear} />
      </div>
    )
  }

  const columns: Column<WorkingDay>[] = [
    {
      key: "date",
      header: "Date",
      cell: (w) => (
        <div className="flex items-center gap-3">
          <DateTile date={w.date} className={TILE_TONE[w.day_type]} />
          <div className="min-w-0">
            <p className="font-medium">{formatDate(w.date)}</p>
            <p className="text-xs text-muted-foreground">{weekdayOf(w.date)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Day type",
      cell: (w) => (
        <Pill tone={dayTypeMeta(w.day_type).tone} dot>
          {w.day_type_display || dayTypeMeta(w.day_type).label}
        </Pill>
      ),
    },
    {
      key: "remarks",
      header: "Remarks",
      hideBelow: "md",
      className: "max-w-xs",
      cell: (w) => <span className="line-clamp-2 text-muted-foreground">{w.remarks || "-"}</span>,
    },
    {
      key: "year",
      header: "Academic year",
      hideBelow: "xl",
      cell: (w) => <span className="text-muted-foreground">{w.academic_year_name}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (w) => (
        <RowActions
          label={formatDate(w.date)}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => setFormTarget(w) },
            { label: "Delete", icon: Trash2, onSelect: () => setDeleteTarget(w), destructive: true },
          ]}
        />
      ),
    },
  ]

  const filtered = !!(params.day_type || params.month)

  return (
    <>
      <Panel
        toolbar={
          <>
            <AcademicYearSelect school={school} value={scope.yearId} onChange={scope.setYear} className="sm:w-48" />
            <FilterSelect
              label="Day type"
              value={params.day_type}
              onChange={(v) => url.set({ day_type: v })}
              allLabel="All day types"
              options={DAY_TYPES.map(({ value, label }) => ({ value, label }))}
            />
            <FilterSelect label="Month" value={params.month} onChange={(v) => url.set({ month: v })} allLabel="All months" options={MONTHS} />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ day_type: null, month: null })} />
            <ToolbarActions>
              <Button variant="outline" onClick={() => setWeekendsOpen(true)} className="h-9" disabled={!scope.yearId}>
                <CalendarCog /> Mark weekends
              </Button>
              <Button onClick={() => setFormTarget("new")} className="h-9 shadow-md shadow-primary/20" disabled={!scope.yearId}>
                <Plus /> Add day
              </Button>
            </ToolbarActions>
          </>
        }
        footer={
          query.data && (
            <Pagination
              count={query.data.count}
              page={url.page}
              pageSize={url.pageSize}
              onPageChange={(page) => url.set({ page })}
              onPageSizeChange={(size) => url.set({ page_size: size })}
            />
          )
        }
      >
        <DataTable
          columns={columns}
          rows={query.data?.results}
          rowKey={(w) => w.id}
          loading={query.isFetching || scope.loading}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(w) => setFormTarget(w)}
          empty={
            <EmptyState
              icon={CalendarCheck}
              title={filtered ? "No days match these filters" : "No calendar days recorded yet"}
              description={
                filtered
                  ? "Try a different day type or month, or clear the filters."
                  : "Mark weekends for the whole year in one go, then add events or special working days."
              }
              action={
                !filtered && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={() => setWeekendsOpen(true)}>
                      <CalendarCog /> Mark weekends
                    </Button>
                    <Button onClick={() => setFormTarget("new")}>
                      <Plus /> Add day
                    </Button>
                  </div>
                )
              }
            />
          }
        />
      </Panel>

      <WorkingDayFormDialog
        open={formTarget !== null}
        onOpenChange={(o) => !o && setFormTarget(null)}
        day={formTarget === "new" ? undefined : (formTarget ?? undefined)}
        school={school}
        defaultYear={scope.yearId}
      />

      <MarkWeekendsDialog open={weekendsOpen} onOpenChange={setWeekendsOpen} school={school} defaultYear={scope.yearId} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title={`Delete the record for ${formatDate(deleteTarget?.date)}?`}
        description="The calendar entry for this date is removed permanently."
        confirmLabel="Delete day"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}

function WorkingDayFormDialog({
  open,
  onOpenChange,
  day,
  school,
  defaultYear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  day?: WorkingDay
  school: number
  defaultYear: number | null
}) {
  const editing = !!day
  const [year, setYear] = useState<number | null>(null)
  const [dayType, setDayType] = useState<DayType>("WORKING")
  const { data: years = [] } = useAcademicYears(school)
  const selectedYear = years.find((y) => y.id === year)
  const errors = useFormErrors()
  const { reset } = errors

  useOpenReset(open, () => {
    reset()
    setYear(day?.academic_year ?? defaultYear)
    setDayType(day?.day_type ?? "WORKING")
  })

  const mutation = useApiMutation(
    (form: FormData) => {
      const value = (key: string) => String(form.get(key) ?? "").trim()
      const body = { academic_year: year, date: value("date"), day_type: dayType, remarks: value("remarks") }
      return day ? academicsApi.workingDays.update(day.id, body) : academicsApi.workingDays.create(body)
    },
    {
      invalidate: INVALIDATE,
      toastError: false,
      onError: errors.capture,
      onSuccess: () => onOpenChange(false),
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    errors.reset()
    mutation.mutate(new FormData(event.currentTarget))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit calendar day" : "Add calendar day"}</DialogTitle>
          <DialogDescription>Record whether a date is a working day, holiday, weekend or event. One record per date.</DialogDescription>
        </DialogHeader>
        <form id="working-day-form" onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form} />
          <Field label="Academic year" htmlFor="wd-year" required error={errors.fields.academic_year}>
            <AcademicYearSelect id="wd-year" school={school} value={year} onChange={setYear} invalid={!!errors.fields.academic_year} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date"
              htmlFor="wd-date"
              required
              error={errors.fields.date}
              hint={selectedYear ? `${formatDate(selectedYear.start_date)} to ${formatDate(selectedYear.end_date)}` : undefined}
            >
              <Input
                id="wd-date"
                name="date"
                type="date"
                required
                defaultValue={day?.date}
                min={selectedYear?.start_date}
                max={selectedYear?.end_date}
              />
            </Field>
            <Field label="Day type" htmlFor="wd-type" required error={errors.fields.day_type}>
              <Select value={dayType} onValueChange={(v) => setDayType(v as DayType)}>
                <SelectTrigger id="wd-type" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Remarks" htmlFor="wd-remarks" error={errors.fields.remarks}>
            <Textarea id="wd-remarks" name="remarks" rows={3} maxLength={255} defaultValue={day?.remarks} placeholder="Optional, e.g. Annual sports day" />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="working-day-form" disabled={mutation.isPending || !year}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            {editing ? "Save changes" : "Add day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface WeekendSummary {
  matched: number
  created: number
  updated: number
  skipped: number
}

function MarkWeekendsDialog({
  open,
  onOpenChange,
  school,
  defaultYear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  school: number
  defaultYear: number | null
}) {
  const [year, setYear] = useState<number | null>(null)
  const [weekdays, setWeekdays] = useState<number[]>([6])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [overwrite, setOverwrite] = useState(false)
  const [result, setResult] = useState<WeekendSummary | null>(null)
  const { data: years = [] } = useAcademicYears(school)
  const selectedYear = years.find((y) => y.id === year)
  const errors = useFormErrors()
  const { reset } = errors

  useOpenReset(open, () => {
    reset()
    setYear(defaultYear)
    setWeekdays([6])
    setStartDate("")
    setEndDate("")
    setOverwrite(false)
    setResult(null)
  })

  const mutation = useApiMutation(
    () =>
      academicsApi.workingDays.markWeekends({
        academic_year: year,
        weekdays,
        overwrite,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      }),
    {
      invalidate: INVALIDATE,
      toastError: false,
      onError: errors.capture,
      onQueued: () => setResult(null),
      onSuccess: (data) => setResult(data),
    }
  )

  function toggleDay(value: number) {
    setResult(null)
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort()))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!year || !weekdays.length) return
    errors.reset()
    setResult(null)
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark weekends</DialogTitle>
          <DialogDescription>
            Marks every chosen weekday in the academic year (or a date range inside it) as a weekend.
          </DialogDescription>
        </DialogHeader>

        <form id="mark-weekends-form" onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form} />
          <Field label="Academic year" htmlFor="mw-year" required error={errors.fields.academic_year}>
            <AcademicYearSelect id="mw-year" school={school} value={year} onChange={setYear} invalid={!!errors.fields.academic_year} />
          </Field>

          <Field label="Weekend days" required error={errors.fields.weekdays ?? (weekdays.length ? undefined : "Pick at least one day.")}>
            <div role="group" aria-label="Weekend days" className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = weekdays.includes(d.value)
                return (
                  <motion.button
                    key={d.value}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    aria-pressed={on}
                    onClick={() => toggleDay(d.value)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-lg border text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm",
                      on ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "bg-card hover:bg-muted"
                    )}
                  >
                    {d.label}
                  </motion.button>
                )
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From" htmlFor="mw-start" error={errors.fields.start_date} hint="Optional, defaults to the year start">
              <Input
                id="mw-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={selectedYear?.start_date}
                max={endDate || selectedYear?.end_date}
              />
            </Field>
            <Field label="To" htmlFor="mw-end" error={errors.fields.end_date} hint="Optional, defaults to the year end">
              <Input
                id="mw-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || selectedYear?.start_date}
                max={selectedYear?.end_date}
              />
            </Field>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
            <div className="grid gap-0.5">
              <Label htmlFor="mw-overwrite">Overwrite existing days</Label>
              <p className="text-xs text-muted-foreground">
                When off, dates that already have a record (for example an event) are left as they are.
              </p>
            </div>
            <Switch id="mw-overwrite" checked={overwrite} onCheckedChange={setOverwrite} />
          </div>

          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
              <SummaryTile icon={CopyCheck} label="Dates matched" value={result.matched} />
              <SummaryTile icon={CalendarPlus} label="Created" value={result.created} tone="ok" />
              <SummaryTile icon={RefreshCw} label="Updated" value={result.updated} tone="ok" />
              <SummaryTile icon={SkipForward} label="Skipped" value={result.skipped} />
            </motion.div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {result ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" form="mark-weekends-form" disabled={mutation.isPending || !year || !weekdays.length}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : result ? <CircleCheck /> : <CalendarCog />}
            {result ? "Run again" : "Mark weekends"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
