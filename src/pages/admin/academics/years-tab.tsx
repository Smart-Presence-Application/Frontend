import { useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarRange, CircleCheckBig, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState, FormAlert } from "@/components/admin/states"
import { ActiveBadge, ClearFiltersButton, Field, FilterSelect, Panel, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUrlState } from "@/hooks/use-url-state"
import { academicsApi } from "@/lib/endpoints"
import { formatDate } from "@/lib/format"
import type { AcademicYear } from "@/lib/types"
import { useOpenReset } from "./helpers"
import { RowActions, ToolbarActions } from "./shared"

const INVALIDATE = [["academic-years"], ["class-sections"], ["holidays"], ["working-days"]]

function durationLabel(start: string, end: string) {
  const days = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1
  if (days < 1) return "-"
  const months = Math.round(days / 30.44)
  return months >= 1 ? `${months} month${months === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"}`
}

export function YearsTab({ school }: { school: number }) {
  const url = useUrlState()
  const [formTarget, setFormTarget] = useState<AcademicYear | "new" | null>(null)
  const [activateTarget, setActivateTarget] = useState<AcademicYear | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null)

  const params = {
    school,
    page: url.page,
    page_size: url.pageSize,
    search: url.get("search"),
    is_active: url.get("is_active"),
    ordering: "-start_date",
  }
  const query = useQuery({
    queryKey: ["academic-years", params],
    queryFn: () => academicsApi.years.list(params),
    placeholderData: keepPreviousData,
  })

  const activateMutation = useApiMutation((id: number) => academicsApi.years.activate(id), {
    invalidate: INVALIDATE,
    onSuccess: () => setActivateTarget(null),
  })
  const deleteMutation = useApiMutation((id: number) => academicsApi.years.remove(id), {
    invalidate: INVALIDATE,
    onSuccess: () => setDeleteTarget(null),
  })

  const columns: Column<AcademicYear>[] = [
    {
      key: "name",
      header: "Academic year",
      cell: (y) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarRange className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{y.name}</p>
            <p className="text-xs text-muted-foreground sm:hidden">
              {formatDate(y.start_date)} to {formatDate(y.end_date)}
            </p>
          </div>
        </div>
      ),
    },
    { key: "start", header: "Starts", hideBelow: "sm", cell: (y) => formatDate(y.start_date) },
    { key: "end", header: "Ends", hideBelow: "sm", cell: (y) => formatDate(y.end_date) },
    {
      key: "duration",
      header: "Duration",
      hideBelow: "lg",
      cell: (y) => <span className="text-muted-foreground">{durationLabel(y.start_date, y.end_date)}</span>,
    },
    { key: "status", header: "Status", cell: (y) => <ActiveBadge active={y.is_active} inactiveLabel="Inactive" /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (y) => (
        <RowActions
          label={y.name}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => setFormTarget(y) },
            { label: "Set as active", icon: CircleCheckBig, onSelect: () => setActivateTarget(y), hidden: y.is_active },
            { label: "Delete", icon: Trash2, onSelect: () => setDeleteTarget(y), destructive: true },
          ]}
        />
      ),
    },
  ]

  const filtered = !!(params.search || params.is_active)

  return (
    <>
      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search academic years" />
            <FilterSelect
              label="Status"
              value={params.is_active}
              onChange={(v) => url.set({ is_active: v })}
              allLabel="All statuses"
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ search: null, is_active: null })} />
            <ToolbarActions>
              <Button onClick={() => setFormTarget("new")} className="h-9 shadow-md shadow-primary/20">
                <Plus /> Add academic year
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
          rowKey={(y) => y.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(y) => setFormTarget(y)}
          empty={
            <EmptyState
              icon={CalendarRange}
              title={filtered ? "No academic years match these filters" : "No academic years yet"}
              description={
                filtered ? "Try a different search or clear the filters." : "Add the first academic year, then mark it active."
              }
              action={
                !filtered && (
                  <Button onClick={() => setFormTarget("new")}>
                    <Plus /> Add academic year
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <YearFormDialog
        open={formTarget !== null}
        onOpenChange={(o) => !o && setFormTarget(null)}
        year={formTarget === "new" ? undefined : (formTarget ?? undefined)}
        school={school}
      />

      <ConfirmDialog
        open={!!activateTarget}
        onOpenChange={(o) => !o && setActivateTarget(null)}
        icon={CircleCheckBig}
        title={`Make ${activateTarget?.name} the active year?`}
        description="Only one academic year can be active per school. The current active year is deactivated automatically."
        confirmLabel="Set as active"
        loading={activateMutation.isPending}
        onConfirm={() => activateTarget && activateMutation.mutate(activateTarget.id)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title={`Delete ${deleteTarget?.name}?`}
        description="This permanently removes the academic year. It cannot be deleted while class sections, holidays or other records still use it."
        confirmLabel="Delete year"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}

function YearFormDialog({
  open,
  onOpenChange,
  year,
  school,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  year?: AcademicYear
  school: number
}) {
  const editing = !!year
  const errors = useFormErrors()
  const { reset } = errors

  useOpenReset(open, reset)

  const mutation = useApiMutation(
    (form: FormData) => {
      const value = (key: string) => String(form.get(key) ?? "").trim()
      const body = { name: value("name"), start_date: value("start_date"), end_date: value("end_date") }
      return year ? academicsApi.years.update(year.id, body) : academicsApi.years.create({ ...body, school })
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
          <DialogTitle>{editing ? "Edit academic year" : "Add academic year"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Change the name or the dates of this academic year."
              : "A new year starts inactive. Set it as active when the school moves to it."}
          </DialogDescription>
        </DialogHeader>

        <form id="year-form" onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form ?? errors.fields.school} />
          <Field label="Name" htmlFor="year-name" required error={errors.fields.name} hint="Up to 20 characters, e.g. 2026-27">
            <Input id="year-name" name="name" required maxLength={20} defaultValue={year?.name} placeholder="2026-27" autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="year-start" required error={errors.fields.start_date}>
              <Input id="year-start" name="start_date" type="date" required defaultValue={year?.start_date} />
            </Field>
            <Field label="End date" htmlFor="year-end" required error={errors.fields.end_date}>
              <Input id="year-end" name="end_date" type="date" required defaultValue={year?.end_date} />
            </Field>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="year-form" disabled={mutation.isPending}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            {editing ? "Save changes" : "Create year"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
