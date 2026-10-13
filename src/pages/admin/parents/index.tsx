import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { HeartHandshake, KeyRound, MoreHorizontal, Pencil, Plus, ShieldCheck, Unlink, Upload, X } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { EmptyState } from "@/components/admin/states"
import { ActiveBadge, ClearFiltersButton, FilterSelect, Panel, PersonCell, Pill, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { parentsApi } from "@/lib/endpoints"
import { formatDateTime, timeAgo } from "@/lib/format"
import type { Parent, Student } from "@/lib/types"
import { ParentBulkDialog } from "./parent-bulk-dialog"
import { MaskedPassword, NewPasswordDialog, ParentCreateDialog, ParentEditDialog } from "./parent-dialogs"

const ORDERING = [
  { value: "user__name", label: "Name A to Z" },
  { value: "-user__name", label: "Name Z to A" },
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
]

type Action = "create" | "bulk" | "edit" | "reset" | "password" | "unlink"

export default function ParentsPage() {
  const url = useUrlState()
  const [action, setAction] = useState<Action | null>(null)
  const [target, setTarget] = useState<Parent>()
  const [child, setChild] = useState<Student>()
  const close = () => setAction(null)
  const openFor = (next: Action, p?: Parent, s?: Student) => {
    if (p) setTarget(p)
    if (s) setChild(s)
    setAction(next)
  }

  const school = Number(url.get("school")) || null
  const classSection = school ? Number(url.get("class_section")) || null : null
  const params = {
    page: url.page,
    page_size: url.pageSize,
    search: url.get("search"),
    school,
    class_section: classSection,
    ordering: url.get("ordering"),
  }
  const query = useQuery({
    queryKey: ["parents", params],
    queryFn: () => parentsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const resetMutation = useApiMutation((id: number) => parentsApi.resetPassword(id), {
    invalidate: [["parents"], ["parent"]],
    onSuccess: (parent) => {
      setTarget(parent)
      setAction("password")
    },
  })
  const unlinkMutation = useApiMutation((v: { parent: number; student: number }) => parentsApi.unlinkStudent(v.parent, v.student), {
    invalidate: [["parents"], ["parent"], ["dashboard"]],
    onSuccess: close,
  })

  const columns: Column<Parent>[] = [
    {
      key: "parent",
      header: "Parent",
      cell: (p) => <PersonCell name={p.name} sub={<span className="font-mono">{p.phone_number}</span>} />,
    },
    {
      key: "children",
      header: "Children",
      hideBelow: "sm",
      cell: (p) => (
        <ul className="flex max-w-md flex-wrap gap-1.5">
          {p.students.map((s) => (
            <li
              key={s.id}
              className="group/chip inline-flex max-w-full items-center gap-1 rounded-lg bg-muted/60 py-1 pr-1 pl-2.5 ring-1 ring-foreground/5"
              title={`${s.name} (${s.student_id}) at ${s.school_name}`}
            >
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-xs font-medium">{s.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  <span className="font-mono">{s.student_id}</span> · {s.school_name}
                </span>
              </span>
              <button
                type="button"
                onClick={() => openFor("unlink", p, s)}
                aria-label={`Unlink ${s.name} from ${p.name}`}
                className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ),
    },
    { key: "status", header: "Status", hideBelow: "lg", cell: (p) => <ActiveBadge active={p.is_active} /> },
    {
      key: "password",
      header: "Password",
      cell: (p) =>
        p.password_changed || !p.initial_password ? (
          <Pill tone="green">
            <ShieldCheck className="size-3" /> Changed by parent
          </Pill>
        ) : (
          <MaskedPassword value={p.initial_password} />
        ),
    },
    {
      key: "last_login",
      header: "Last login",
      hideBelow: "xl",
      cell: (p) =>
        p.last_login ? (
          <span className="text-sm whitespace-nowrap" title={formatDateTime(p.last_login)}>
            {timeAgo(p.last_login)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => openFor("edit", p)}>
              <Pencil /> Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openFor("reset", p)}>
              <KeyRound /> Reset password
            </DropdownMenuItem>
            {p.students.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Unlink a child</DropdownMenuLabel>
                {p.students.map((s) => (
                  <DropdownMenuItem key={s.id} variant="destructive" onSelect={() => openFor("unlink", p, s)}>
                    <Unlink /> <span className="truncate">{s.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const filtered = !!(params.search || school)
  const lastChild = target?.students.length === 1

  return (
    <>
      <PageHeader
        title="Parents"
        icon={HeartHandshake}
        description="Parent accounts, their linked children and the login details to share with them."
        actions={
          <>
            <Button variant="outline" onClick={() => openFor("bulk")} className="h-9">
              <Upload /> Bulk upload
            </Button>
            <Button onClick={() => openFor("create")} className="h-9 shadow-md shadow-primary/20">
              <Plus /> Add parent
            </Button>
          </>
        }
      />

      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search parent, phone, child name or ID" />
            <SchoolPicker
              value={school}
              onChange={(v) => url.set({ school: v, class_section: null })}
              placeholder="All schools"
              clearable
              className="w-full sm:w-52"
            />
            <ClassSectionSelect school={school} value={classSection} onChange={(v) => url.set({ class_section: v })} allowAll className="sm:w-48" />
            <FilterSelect label="Sort by" value={params.ordering} onChange={(v) => url.set({ ordering: v })} allLabel="Roll number" options={ORDERING} />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ search: null, school: null, class_section: null })} />
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
          rowKey={(p) => p.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={
            <EmptyState
              icon={HeartHandshake}
              title={filtered ? "No parents match these filters" : "No parents yet"}
              description={filtered ? "Try a different search or clear the filters." : "Add a parent using their child's student ID."}
              action={
                !filtered && (
                  <Button onClick={() => openFor("create")}>
                    <Plus /> Add parent
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <ParentCreateDialog open={action === "create"} onOpenChange={(o) => !o && close()} defaultSchool={school} />
      <ParentBulkDialog open={action === "bulk"} onOpenChange={(o) => !o && close()} defaultSchool={school} />
      <ParentEditDialog open={action === "edit"} onOpenChange={(o) => !o && close()} parent={target} />
      <NewPasswordDialog open={action === "password"} onOpenChange={(o) => !o && close()} parent={target} />

      <ConfirmDialog
        open={action === "reset"}
        onOpenChange={(o) => !o && close()}
        icon={KeyRound}
        title={`Reset password for ${target?.name}?`}
        description="A new password is generated and the current one stops working. You will need to share the new password with the parent."
        confirmLabel="Reset password"
        loading={resetMutation.isPending}
        onConfirm={() => target && resetMutation.mutate(target.id)}
      />

      <ConfirmDialog
        open={action === "unlink"}
        onOpenChange={(o) => !o && close()}
        icon={Unlink}
        destructive
        title={`Unlink ${child?.name} from ${target?.name}?`}
        description={
          lastChild
            ? `${child?.name} is their only linked child, so the parent account will be deleted as well.`
            : `${target?.name} will no longer see ${child?.name}'s attendance.`
        }
        confirmLabel={lastChild ? "Unlink and delete parent" : "Unlink"}
        loading={unlinkMutation.isPending}
        onConfirm={() => target && child && unlinkMutation.mutate({ parent: target.id, student: child.id })}
      />
    </>
  )
}
