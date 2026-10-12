import { useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarDays, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Pagination } from "@/components/admin/pagination"
import { AcademicYearSelect, useAcademicYears } from "@/components/admin/pickers"
import { EmptyState, FormAlert } from "@/components/admin/states"
import { ClearFiltersButton, Field, FilterSelect, Panel, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUrlState } from "@/hooks/use-url-state"
import { academicsApi } from "@/lib/endpoints"
import { formatDate } from "@/lib/format"
import type { Holiday } from "@/lib/types"
import { MONTHS, useYearScope, weekdayOf, useOpenReset } from "./helpers"
import { DateTile, NoYearsState, RowActions, ToolbarActions } from "./shared"

const INVALIDATE = [["holidays"]]

export function HolidaysTab({ school, onCreateYear }: { school: number; onCreateYear: () => void }) {
  const url = useUrlState()
  const scope = useYearScope(school)
  const [formTarget, setFormTarget] = useState<Holiday | "new" | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)

  const params = {
    academic_year: scope.yearId,
    month: url.get("month"),
    search: url.get("search"),
    page: url.page,
    page_size: url.pageSize,
    ordering: "date",
  }
  const query = useQuery({
    queryKey: ["holidays", params],
    queryFn: () => academicsApi.holidays.list(params),
    enabled: !!scope.yearId,
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation((id: number) => academicsApi.holidays.remove(id), {
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

  const columns: Column<Holiday>[] = [
    {
      key: "holiday",
      header: "Holiday",
      cell: (h) => (
        <div className="flex items-center gap-3">
          <DateTile date={h.date} />
          <div className="min-w-0">
            <p className="truncate font-medium">{h.title}</p>
            <p className="text-xs text-muted-foreground">{weekdayOf(h.date)}</p>
          </div>
        </div>
      ),
    },
    { key: "date", header: "Date", hideBelow: "sm", cell: (h) => formatDate(h.date) },
    {
      key: "description",
      header: "Description",
      hideBelow: "lg",
      className: "max-w-xs",
      cell: (h) => <span className="line-clamp-2 text-muted-foreground">{h.description || "-"}</span>,
    },
    {
      key: "year",
      header: "Academic year",
      hideBelow: "xl",
      cell: (h) => <span className="text-muted-foreground">{h.academic_year_name}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (h) => (
        <RowActions
          label={h.title}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => setFormTarget(h) },
            { label: "Delete", icon: Trash2, onSelect: () => setDeleteTarget(h), destructive: true },
          ]}
        />
      ),
    },
  ]

  const filtered = !!(params.search || params.month)

  return (
    <>
      <Panel
        toolbar={
          <>
            <AcademicYearSelect school={school} value={scope.yearId} onChange={scope.setYear} className="sm:w-48" />
            <FilterSelect
              label="Month"
              value={params.month}
              onChange={(v) => url.set({ month: v })}
              allLabel="All months"
              options={MONTHS}
            />
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search holidays" className="sm:w-56" />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ search: null, month: null })} />
            <ToolbarActions>
              <Button onClick={() => setFormTarget("new")} className="h-9 shadow-md shadow-primary/20" disabled={!scope.yearId}>
                <Plus /> Add holiday
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
          rowKey={(h) => h.id}
          loading={query.isFetching || scope.loading}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(h) => setFormTarget(h)}
          empty={
            <EmptyState
              icon={CalendarDays}
              title={filtered ? "No holidays match these filters" : "No holidays in this year"}
              description={filtered ? "Try a different month or search, or clear the filters." : "Add festivals, vacations and other days the school is closed."}
              action={
                !filtered && (
                  <Button onClick={() => setFormTarget("new")}>
                    <Plus /> Add holiday
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <HolidayFormDialog
        open={formTarget !== null}
        onOpenChange={(o) => !o && setFormTarget(null)}
        holiday={formTarget === "new" ? undefined : (formTarget ?? undefined)}
        school={school}
        defaultYear={scope.yearId}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title={`Delete ${deleteTarget?.title}?`}
        description={`The holiday on ${formatDate(deleteTarget?.date)} is removed permanently.`}
        confirmLabel="Delete holiday"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}

function HolidayFormDialog({
  open,
  onOpenChange,
  holiday,
  school,
  defaultYear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  holiday?: Holiday
  school: number
  defaultYear: number | null
}) {
  const editing = !!holiday
  const [year, setYear] = useState<number | null>(null)
  const { data: years = [] } = useAcademicYears(school)
  const selectedYear = years.find((y) => y.id === year)
  const errors = useFormErrors()
  const { reset } = errors

  useOpenReset(open, () => {
    reset()
    setYear(holiday?.academic_year ?? defaultYear)
  })

  const mutation = useApiMutation(
    (form: FormData) => {
      const value = (key: string) => String(form.get(key) ?? "").trim()
      const body = { academic_year: year, title: value("title"), date: value("date"), description: value("description") }
      return holiday ? academicsApi.holidays.update(holiday.id, body) : academicsApi.holidays.create(body)
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
          <DialogTitle>{editing ? "Edit holiday" : "Add holiday"}</DialogTitle>
          <DialogDescription>Holidays must fall inside the academic year. Only one holiday is allowed per date.</DialogDescription>
        </DialogHeader>
        <form id="holiday-form" onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form} />
          <Field label="Academic year" htmlFor="holiday-year" required error={errors.fields.academic_year}>
            <AcademicYearSelect id="holiday-year" school={school} value={year} onChange={setYear} invalid={!!errors.fields.academic_year} />
          </Field>
          <Field label="Title" htmlFor="holiday-title" required error={errors.fields.title}>
            <Input id="holiday-title" name="title" required maxLength={255} defaultValue={holiday?.title} placeholder="Diwali" autoFocus />
          </Field>
          <Field
            label="Date"
            htmlFor="holiday-date"
            required
            error={errors.fields.date}
            hint={selectedYear ? `Between ${formatDate(selectedYear.start_date)} and ${formatDate(selectedYear.end_date)}` : undefined}
          >
            <Input
              id="holiday-date"
              name="date"
              type="date"
              required
              defaultValue={holiday?.date}
              min={selectedYear?.start_date}
              max={selectedYear?.end_date}
            />
          </Field>
          <Field label="Description" htmlFor="holiday-description" error={errors.fields.description}>
            <Textarea id="holiday-description" name="description" rows={3} defaultValue={holiday?.description} placeholder="Optional note" />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="holiday-form" disabled={mutation.isPending || !year}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            {editing ? "Save changes" : "Add holiday"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
