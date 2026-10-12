import { useMemo, useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Layers, LoaderCircle, Pencil, Plus, Shapes, Trash2, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState, FormAlert } from "@/components/admin/states"
import { ClearFiltersButton, Field, Panel, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUrlState } from "@/hooks/use-url-state"
import { academicsApi } from "@/lib/endpoints"
import type { NamedSchoolItem } from "@/lib/types"
import { failureMessage, parseNames, type BulkFailure, useOpenReset } from "./helpers"
import { BulkOutcome, RowActions, ToolbarActions, type BulkRow } from "./shared"

type Kind = "classes" | "sections"

const COPY = {
  classes: {
    singular: "class",
    plural: "classes",
    maxLength: 100,
    Title: "Classes",
    icon: Shapes,
    example: "Nursery, LKG, UKG, 1, 2, 3",
    hint: "Class names like 1, 2, 10 or Nursery. Combine them with sections in the Class sections tab.",
  },
  sections: {
    singular: "section",
    plural: "sections",
    maxLength: 50,
    Title: "Sections",
    icon: Layers,
    example: "A, B, C, D",
    hint: "Section names like A, B or Rose. Combine them with classes in the Class sections tab.",
  },
} as const

export function NamesTab({ kind, school }: { kind: Kind; school: number }) {
  const copy = COPY[kind]
  const Icon = copy.icon
  const url = useUrlState()
  const [bulkOpen, setBulkOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<NamedSchoolItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NamedSchoolItem | null>(null)

  const params = { school, page: url.page, page_size: url.pageSize, search: url.get("search") }
  const query = useQuery({
    queryKey: [kind, params],
    queryFn: () => academicsApi[kind].list(params),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation((id: number) => academicsApi[kind].remove(id), {
    invalidate: [[kind], ["class-sections"]],
    onSuccess: () => setDeleteTarget(null),
  })

  const columns: Column<NamedSchoolItem>[] = [
    {
      key: "name",
      header: copy.singular === "class" ? "Class" : "Section",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
            {item.name.slice(0, 3)}
          </span>
          <p className="truncate font-medium">
            {kind === "classes" ? "Class " : "Section "}
            {item.name}
          </p>
        </div>
      ),
    },
    { key: "school", header: "School", hideBelow: "md", cell: (item) => <span className="text-muted-foreground">{item.school_name}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (item) => (
        <RowActions
          label={item.name}
          actions={[
            { label: "Rename", icon: Pencil, onSelect: () => setRenameTarget(item) },
            { label: "Delete", icon: Trash2, onSelect: () => setDeleteTarget(item), destructive: true },
          ]}
        />
      ),
    },
  ]

  const filtered = !!params.search

  return (
    <>
      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder={`Search ${copy.plural}`} />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ search: null })} />
            <ToolbarActions>
              <Button onClick={() => setBulkOpen(true)} className="h-9 shadow-md shadow-primary/20">
                <Plus /> Add {copy.plural}
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
          rowKey={(item) => item.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(item) => setRenameTarget(item)}
          empty={
            <EmptyState
              icon={Icon}
              title={filtered ? `No ${copy.plural} match this search` : `No ${copy.plural} yet`}
              description={filtered ? "Try a different search or clear it." : copy.hint}
              action={
                !filtered && (
                  <Button onClick={() => setBulkOpen(true)}>
                    <Plus /> Add {copy.plural}
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <BulkNamesDialog open={bulkOpen} onOpenChange={setBulkOpen} kind={kind} school={school} />
      <RenameDialog
        open={!!renameTarget}
        onOpenChange={(o) => !o && setRenameTarget(null)}
        item={renameTarget}
        kind={kind}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title={`Delete ${copy.singular} ${deleteTarget?.name}?`}
        description={`This permanently removes the ${copy.singular}. It cannot be deleted while class sections still use it.`}
        confirmLabel={`Delete ${copy.singular}`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}

/** Creates many names at once. Names that fail stay in the box so they can be fixed and retried. */
function BulkNamesDialog({
  open,
  onOpenChange,
  kind,
  school,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: Kind
  school: number
}) {
  const copy = COPY[kind]
  const [text, setText] = useState("")
  const [outcome, setOutcome] = useState<{ created: BulkRow[]; failed: BulkRow[] } | null>(null)
  const errors = useFormErrors()
  const { reset } = errors
  const names = useMemo(() => parseNames(text), [text])
  const tooLong = names.filter((n) => n.length > copy.maxLength)

  useOpenReset(open, () => {
    reset()
    setText("")
    setOutcome(null)
  })

  const mutation = useApiMutation(
    (items: string[]) => academicsApi[kind].create(items.map((name) => ({ name, school }))),
    {
      invalidate: [[kind]],
      toastSuccess: false,
      toastError: false,
      onError: errors.capture,
      onSuccess: (data) => {
        const failed = (data.failed ?? []) as BulkFailure[]
        const created = data.created ?? []
        if (created.length) toast.success(`${created.length} ${created.length === 1 ? copy.singular : copy.plural} created`)
        if (failed.length) toast.warning(`${failed.length} could not be created`)
        setOutcome({
          created: created.map((c) => ({ key: c.id, label: c.name })),
          failed: failed.map((f, i) => ({ key: `${f.name ?? ""}-${i}`, label: f.name || "Unnamed", message: failureMessage(f) })),
        })
        setText(failed.map((f) => f.name ?? "").filter(Boolean).join("\n"))
      },
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!names.length) return
    errors.reset()
    setOutcome(null)
    mutation.mutate(names)
  }

  function removeName(name: string) {
    setText(names.filter((n) => n !== name).join("\n"))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {copy.plural}</DialogTitle>
          <DialogDescription>
            Type one or more {copy.plural}, separated by commas or new lines. Each one is created separately, so a duplicate
            does not stop the rest.
          </DialogDescription>
        </DialogHeader>

        <form id={`bulk-${kind}-form`} onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form} />
          <Field
            label={`${copy.Title} to add`}
            htmlFor={`bulk-${kind}`}
            hint={`For example: ${copy.example}`}
            error={tooLong.length ? `Names must be ${copy.maxLength} characters or fewer: ${tooLong.join(", ")}` : undefined}
          >
            <Textarea
              id={`bulk-${kind}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={copy.example}
              autoFocus
            />
          </Field>

          {names.length > 0 && (
            <div className="grid gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {names.length} {names.length === 1 ? copy.singular : copy.plural} will be created
              </p>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                  {names.map((name) => (
                    <motion.span
                      key={name}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="inline-flex h-7 items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 text-xs font-medium ring-1 ring-foreground/10 ring-inset"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeName(name)}
                        aria-label={`Remove ${name}`}
                        className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {outcome && <BulkOutcome created={outcome.created} failed={outcome.failed} noun={copy.plural} />}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {outcome ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" form={`bulk-${kind}-form`} disabled={mutation.isPending || !names.length || tooLong.length > 0}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            {outcome && names.length ? "Retry" : "Create"} {names.length > 0 && names.length}{" "}
            {names.length === 1 ? copy.singular : copy.plural}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RenameDialog({
  open,
  onOpenChange,
  item,
  kind,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: NamedSchoolItem | null
  kind: Kind
}) {
  const copy = COPY[kind]
  const errors = useFormErrors()
  const { reset } = errors

  useOpenReset(open, reset)

  const mutation = useApiMutation(
    ({ id, name }: { id: number; name: string }) => academicsApi[kind].update(id, { name }),
    {
      invalidate: [[kind], ["class-sections"]],
      toastError: false,
      onError: errors.capture,
      onSuccess: () => onOpenChange(false),
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item) return
    errors.reset()
    mutation.mutate({ id: item.id, name: String(new FormData(event.currentTarget).get("name") ?? "").trim() })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename {copy.singular}</DialogTitle>
          <DialogDescription>Class sections that use it pick up the new name automatically.</DialogDescription>
        </DialogHeader>
        <form id={`rename-${kind}-form`} onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form} />
          <Field label="Name" htmlFor={`rename-${kind}`} required error={errors.fields.name}>
            <Input id={`rename-${kind}`} name="name" required maxLength={copy.maxLength} defaultValue={item?.name} autoFocus />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={`rename-${kind}-form`} disabled={mutation.isPending}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
