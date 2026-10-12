import { useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutGrid, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Pagination } from "@/components/admin/pagination"
import { AcademicYearSelect } from "@/components/admin/pickers"
import { EmptyState, FormAlert } from "@/components/admin/states"
import { ActiveBadge, ClearFiltersButton, Field, FilterSelect, Panel } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUrlState } from "@/hooks/use-url-state"
import { academicsApi } from "@/lib/endpoints"
import { classSectionLabel } from "@/lib/format"
import type { ClassSection, NamedSchoolItem } from "@/lib/types"
import { cn } from "@/lib/utils"
import { failureMessage, useSchoolNames, useYearScope, type BulkFailure, useOpenReset } from "./helpers"
import { BulkOutcome, NoYearsState, RowActions, ToolbarActions, type BulkRow } from "./shared"

const INVALIDATE = [["class-sections"]]

/** Shape of each `created` entry returned by the bulk class-section endpoint. */
interface CreatedCombo {
  id: number
  school_class?: { id: number; name: string }
  section?: { id: number; name: string }
}

export function ClassSectionsTab({ school, onCreateYear }: { school: number; onCreateYear: () => void }) {
  const url = useUrlState()
  const scope = useYearScope(school)
  const classes = useSchoolNames("classes", school)
  const sections = useSchoolNames("sections", school)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClassSection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassSection | null>(null)

  const params = {
    academic_year: scope.yearId,
    school_class: url.get("school_class"),
    section: url.get("section"),
    page: url.page,
    page_size: url.pageSize,
  }
  const query = useQuery({
    queryKey: ["class-sections", params],
    queryFn: () => academicsApi.classSections.list(params),
    enabled: !!scope.yearId,
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation((id: number) => academicsApi.classSections.remove(id), {
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

  const columns: Column<ClassSection>[] = [
    {
      key: "label",
      header: "Class section",
      cell: (cs) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 px-2 text-sm font-semibold text-primary">
            {cs.class_name}
            {cs.section_name.slice(0, 2)}
          </span>
          <p className="truncate font-medium">{classSectionLabel(cs)}</p>
        </div>
      ),
    },
    { key: "class", header: "Class", hideBelow: "sm", cell: (cs) => cs.class_name },
    { key: "section", header: "Section", hideBelow: "sm", cell: (cs) => cs.section_name },
    {
      key: "year",
      header: "Academic year",
      hideBelow: "md",
      cell: (cs) => <span className="text-muted-foreground">{cs.academic_year_name}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (cs) => (
        <RowActions
          label={classSectionLabel(cs)}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => setEditTarget(cs) },
            { label: "Delete", icon: Trash2, onSelect: () => setDeleteTarget(cs), destructive: true },
          ]}
        />
      ),
    },
  ]

  const filtered = !!(params.school_class || params.section)
  const toOptions = (items?: NamedSchoolItem[]) => (items ?? []).map((i) => ({ value: String(i.id), label: i.name }))

  return (
    <>
      <Panel
        toolbar={
          <>
            <div className="flex items-center gap-2">
              <AcademicYearSelect school={school} value={scope.yearId} onChange={scope.setYear} className="sm:w-48" />
              {scope.year && <ActiveBadge active={scope.year.is_active} inactiveLabel="Not active" />}
            </div>
            <FilterSelect
              label="Class"
              value={params.school_class}
              onChange={(v) => url.set({ school_class: v })}
              allLabel="All classes"
              options={toOptions(classes.data)}
            />
            <FilterSelect
              label="Section"
              value={params.section}
              onChange={(v) => url.set({ section: v })}
              allLabel="All sections"
              options={toOptions(sections.data)}
            />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ school_class: null, section: null })} />
            <ToolbarActions>
              <Button onClick={() => setBulkOpen(true)} className="h-9 shadow-md shadow-primary/20" disabled={!scope.yearId}>
                <Plus /> Add class sections
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
          rowKey={(cs) => cs.id}
          loading={query.isFetching || scope.loading}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(cs) => setEditTarget(cs)}
          empty={
            <EmptyState
              icon={LayoutGrid}
              title={filtered ? "No class sections match these filters" : "No class sections in this year"}
              description={
                filtered
                  ? "Try a different class or section, or clear the filters."
                  : "Combine classes and sections to create the class sections students and teachers are assigned to."
              }
              action={
                !filtered && (
                  <Button onClick={() => setBulkOpen(true)}>
                    <Plus /> Add class sections
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <BulkClassSectionsDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        school={school}
        defaultYear={scope.yearId}
        classes={classes.data ?? []}
        sections={sections.data ?? []}
        loadingNames={classes.isLoading || sections.isLoading}
      />

      <EditClassSectionDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        item={editTarget}
        school={school}
        classes={classes.data ?? []}
        sections={sections.data ?? []}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title={`Delete ${classSectionLabel(deleteTarget)}?`}
        description="This permanently removes the class section from this academic year. It cannot be deleted while students, teachers or attendance still use it."
        confirmLabel="Delete class section"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}

function CheckList({
  title,
  items,
  selected,
  onChange,
  prefix,
}: {
  title: string
  items: NamedSchoolItem[]
  selected: Set<number>
  onChange: (next: Set<number>) => void
  prefix: string
}) {
  const all = items.length > 0 && items.every((i) => selected.has(i.id))
  function toggle(id: number) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }
  return (
    <div className="grid gap-2 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {title}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {selected.size} of {items.length}
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!items.length}
          onClick={() => onChange(all ? new Set() : new Set(items.map((i) => i.id)))}
        >
          {all ? "Clear" : "Select all"}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">None yet. Add them in the {title} tab first.</p>
      ) : (
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const id = `${prefix}-${item.id}`
            const checked = selected.has(item.id)
            return (
              <label
                key={item.id}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                  checked && "bg-primary/5 font-medium"
                )}
              >
                <Checkbox id={id} checked={checked} onCheckedChange={() => toggle(item.id)} />
                <span className="truncate">{item.name}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BulkClassSectionsDialog({
  open,
  onOpenChange,
  school,
  defaultYear,
  classes,
  sections,
  loadingNames,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  school: number
  defaultYear: number | null
  classes: NamedSchoolItem[]
  sections: NamedSchoolItem[]
  loadingNames: boolean
}) {
  const [year, setYear] = useState<number | null>(defaultYear)
  const [classIds, setClassIds] = useState<Set<number>>(new Set())
  const [sectionIds, setSectionIds] = useState<Set<number>>(new Set())
  const [outcome, setOutcome] = useState<{ created: BulkRow[]; failed: BulkRow[] } | null>(null)
  const errors = useFormErrors()
  const { reset } = errors

  useOpenReset(open, () => {
    reset()
    setYear(defaultYear)
    setClassIds(new Set())
    setSectionIds(new Set())
    setOutcome(null)
  })

  const total = classIds.size * sectionIds.size
  const nameOf = (list: NamedSchoolItem[], id?: number) => list.find((i) => i.id === id)?.name ?? (id ? `#${id}` : "?")

  const mutation = useApiMutation(
    (items: { academic_year: number; school_class: number; section: number }[]) => academicsApi.classSections.create(items),
    {
      invalidate: INVALIDATE,
      toastSuccess: false,
      toastError: false,
      onError: errors.capture,
      onSuccess: (data) => {
        const created = (data.created ?? []) as unknown as CreatedCombo[]
        const failed = (data.failed ?? []) as BulkFailure[]
        if (created.length) toast.success(`${created.length} class ${created.length === 1 ? "section" : "sections"} created`)
        if (failed.length) toast.warning(`${failed.length} could not be created`)
        setOutcome({
          created: created.map((c) => ({
            key: c.id,
            label: `${c.school_class?.name ?? "?"} - ${c.section?.name ?? "?"}`,
          })),
          failed: failed.map((f, i) => ({
            key: i,
            label: `Class ${nameOf(classes, f.school_class)} - ${nameOf(sections, f.section)}`,
            message: failureMessage(f),
          })),
        })
        setClassIds(new Set())
        setSectionIds(new Set())
      },
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!year || !total) return
    errors.reset()
    setOutcome(null)
    const items = [...classIds].flatMap((school_class) =>
      [...sectionIds].map((section) => ({ academic_year: year, school_class, section }))
    )
    mutation.mutate(items)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add class sections</DialogTitle>
          <DialogDescription>
            Pick classes and sections. Every class is combined with every section in the chosen academic year. Existing
            combinations are skipped and listed below.
          </DialogDescription>
        </DialogHeader>

        <form id="bulk-class-sections-form" onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form} />
          <Field label="Academic year" htmlFor="bulk-cs-year" required>
            <AcademicYearSelect id="bulk-cs-year" school={school} value={year} onChange={setYear} />
          </Field>

          {loadingNames ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Loading classes and sections
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckList title="Classes" prefix="bulk-class" items={classes} selected={classIds} onChange={setClassIds} />
              <CheckList title="Sections" prefix="bulk-section" items={sections} selected={sectionIds} onChange={setSectionIds} />
            </div>
          )}

          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{classIds.size}</span> classes x{" "}
            <span className="font-semibold text-foreground tabular-nums">{sectionIds.size}</span> sections ={" "}
            <span className="font-semibold text-primary tabular-nums">{total}</span> class sections
          </p>

          {outcome && <BulkOutcome created={outcome.created} failed={outcome.failed} noun="class sections" />}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {outcome ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" form="bulk-class-sections-form" disabled={mutation.isPending || !year || !total}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            Create {total > 0 && total} class {total === 1 ? "section" : "sections"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NameSelect({
  id,
  label,
  items,
  value,
  onChange,
  invalid,
}: {
  id: string
  label: string
  items: NamedSchoolItem[]
  value: number | null
  onChange: (v: number) => void
  invalid?: boolean
}) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} aria-label={label} aria-invalid={invalid || undefined} className="h-9 w-full">
        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.id} value={String(i.id)}>
            {i.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function EditClassSectionDialog({
  open,
  onOpenChange,
  item,
  school,
  classes,
  sections,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ClassSection | null
  school: number
  classes: NamedSchoolItem[]
  sections: NamedSchoolItem[]
}) {
  const [year, setYear] = useState<number | null>(null)
  const [schoolClass, setSchoolClass] = useState<number | null>(null)
  const [section, setSection] = useState<number | null>(null)
  const errors = useFormErrors()
  const { reset } = errors

  useOpenReset(open, () => {
    if (!item) return
    reset()
    setYear(item.academic_year)
    setSchoolClass(item.school_class)
    setSection(item.section)
  })

  const mutation = useApiMutation(
    (body: { academic_year: number | null; school_class: number | null; section: number | null }) =>
      academicsApi.classSections.update(item?.id ?? 0, body),
    {
      invalidate: INVALIDATE,
      toastError: false,
      onError: errors.capture,
      onSuccess: () => onOpenChange(false),
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item) return
    errors.reset()
    mutation.mutate({ academic_year: year, school_class: schoolClass, section })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit class section</DialogTitle>
          <DialogDescription>Change the academic year, class or section. The new combination must not already exist.</DialogDescription>
        </DialogHeader>
        <form id="edit-class-section-form" onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form} />
          <Field label="Academic year" htmlFor="edit-cs-year" required error={errors.fields.academic_year}>
            <AcademicYearSelect
              id="edit-cs-year"
              school={school}
              value={year}
              onChange={setYear}
              invalid={!!errors.fields.academic_year}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class" htmlFor="edit-cs-class" required error={errors.fields.school_class}>
              <NameSelect
                id="edit-cs-class"
                label="Class"
                items={classes}
                value={schoolClass}
                onChange={setSchoolClass}
                invalid={!!errors.fields.school_class}
              />
            </Field>
            <Field label="Section" htmlFor="edit-cs-section" required error={errors.fields.section}>
              <NameSelect
                id="edit-cs-section"
                label="Section"
                items={sections}
                value={section}
                onChange={setSection}
                invalid={!!errors.fields.section}
              />
            </Field>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="edit-class-section-form" disabled={mutation.isPending || !year || !schoolClass || !section}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
