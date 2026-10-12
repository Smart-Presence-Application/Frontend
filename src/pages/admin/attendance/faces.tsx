import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Images, MoreHorizontal, ScanFace, School, Trash2, UserRoundCheck, UserX } from "lucide-react"
import { motion } from "motion/react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { EmptyState } from "@/components/admin/states"
import { ClearFiltersButton, FilterSelect, Panel, PersonCell, Pill, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { countOf, facesApi } from "@/lib/endpoints"
import { timeAgo } from "@/lib/format"
import type { FaceStatus } from "@/lib/types"
import { BulkRegisterDialog, ProfileRegisterDialog, SingleRegisterDialog } from "./face-dialogs"

const FACES_PATH = "student-attendance/faces/"

const SOURCE_LABEL: Record<string, string> = { UPLOAD: "Uploaded photo", PROFILE_IMAGE: "Profile photo" }
const sourceLabel = (s: string | null) => (s ? (SOURCE_LABEL[s] ?? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")) : null)

function CoverageStrip({ school, classSection }: { school: number; classSection: number | null }) {
  const scope = { school, class_section: classSection }
  const registered = useQuery({
    queryKey: ["faces", { ...scope, registered: true, count: true }],
    queryFn: () => countOf(FACES_PATH, { ...scope, registered: true }),
  })
  const missing = useQuery({
    queryKey: ["faces", { ...scope, registered: false, count: true }],
    queryFn: () => countOf(FACES_PATH, { ...scope, registered: false }),
  })
  const loading = registered.isLoading || missing.isLoading
  const total = (registered.data ?? 0) + (missing.data ?? 0)
  const pct = total ? Math.round(((registered.data ?? 0) / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 grid gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:grid-cols-[auto_1fr] sm:items-center sm:p-5"
    >
      <div className="flex gap-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRoundCheck className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Registered</p>
            {loading ? <Skeleton className="mt-1 h-6 w-12" /> : <p className="text-xl font-bold tabular-nums">{registered.data ?? "-"}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <UserX className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Not registered</p>
            {loading ? <Skeleton className="mt-1 h-6 w-12" /> : <p className="text-xl font-bold tabular-nums">{missing.data ?? "-"}</p>}
          </div>
        </div>
      </div>
      <div className="sm:pl-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          <span>Face coverage</span>
          <span className="font-medium text-foreground tabular-nums">{loading ? "-" : `${pct}%`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${loading ? 0 : pct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </motion.div>
  )
}

/** The face registry. A dialog key is bumped on every open so the dialogs remount with fresh form state. */
export default function FacesPage() {
  const url = useUrlState()
  const [bulkOpen, setBulkOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [registerTarget, setRegisterTarget] = useState<FaceStatus | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FaceStatus | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const bump = () => setDialogKey((k) => k + 1)

  const school = Number(url.get("school")) || null
  const classSection = Number(url.get("class_section")) || null
  const params = {
    page: url.page,
    page_size: url.pageSize,
    school,
    class_section: classSection,
    registered: url.get("registered"),
    search: url.get("search"),
  }
  const query = useQuery({
    queryKey: ["faces", params],
    queryFn: () => facesApi.list(params),
    placeholderData: keepPreviousData,
    enabled: !!school,
  })

  const deleteMutation = useApiMutation((id: number) => facesApi.remove(id), {
    invalidate: [["faces"], ["students"], ["dashboard"]],
    onSuccess: () => setDeleteTarget(null),
  })

  const columns: Column<FaceStatus>[] = [
    {
      key: "student",
      header: "Student",
      cell: (s) => <PersonCell name={s.name} src={s.profile_image} sub={<span className="font-mono">{s.student_id}</span>} />,
    },
    {
      key: "roll",
      header: "Roll",
      hideBelow: "sm",
      cell: (s) => <span className="font-mono text-sm tabular-nums">{s.roll_number || "-"}</span>,
    },
    {
      key: "face",
      header: "Face",
      cell: (s) =>
        s.face_registered ? (
          <div className="grid gap-1">
            <Pill tone="green" className="w-fit">
              <ScanFace className="size-3" /> Registered
            </Pill>
            <span className="hidden text-xs text-muted-foreground md:block">
              {[sourceLabel(s.face_source), timeAgo(s.face_registered_at)].filter(Boolean).join(" · ")}
            </span>
          </div>
        ) : (
          <Pill tone="gray" dot>
            Not registered
          </Pill>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => {
                bump()
                setRegisterTarget(s)
              }}>
              <ScanFace /> {s.face_registered ? "Replace face from photo" : "Register from photo"}
            </DropdownMenuItem>
            {s.face_registered && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(s)}>
                  <Trash2 /> Delete face
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const filtered = !!(classSection || params.registered || params.search)

  return (
    <>
      <PageHeader
        title="Face registry"
        icon={ScanFace}
        description="Register student faces so the AI can recognise them in classroom photos."
        actions={
          <>
            <Button variant="outline" className="h-9" onClick={() => {
                bump()
                setProfileOpen(true)
              }}>
              <UserRoundCheck /> Register from profile photos
            </Button>
            <Button onClick={() => {
                bump()
                setBulkOpen(true)
              }} className="h-9 shadow-md shadow-primary/20">
              <Images /> Bulk register
            </Button>
          </>
        }
      />

      {school && <CoverageStrip school={school} classSection={classSection} />}

      <Panel
        toolbar={
          <>
            <SchoolPicker
              value={school}
              onChange={(v) => url.set({ school: v, class_section: null })}
              placeholder="Select a school"
              className="h-9 w-full sm:w-56"
            />
            <ClassSectionSelect school={school} value={classSection} onChange={(v) => url.set({ class_section: v })} allowAll className="sm:w-52" />
            <FilterSelect
              label="Face status"
              value={params.registered}
              onChange={(v) => url.set({ registered: v })}
              allLabel="All students"
              className="sm:w-40"
              options={[
                { value: "true", label: "Registered" },
                { value: "false", label: "Not registered" },
              ]}
            />
            {school && <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name, ID, roll number" />}
            <ClearFiltersButton show={filtered} onClick={() => url.set({ class_section: null, registered: null, search: null })} />
          </>
        }
        footer={
          school &&
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
        {!school ? (
          <EmptyState
            icon={School}
            title="Pick a school to see its students"
            description="Face registrations are managed one school at a time. Choose a school above to get started."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={query.data?.results}
            rowKey={(s) => s.id}
            loading={query.isFetching}
            error={query.error}
            onRetry={query.refetch}
            empty={
              <EmptyState
                icon={ScanFace}
                title={filtered ? "No students match these filters" : "No students in this school yet"}
                description={filtered ? "Try a different search or clear the filters." : "Add students first, then register their faces."}
              />
            }
          />
        )}
      </Panel>

      <BulkRegisterDialog key={`bulk-${dialogKey}`} open={bulkOpen} onOpenChange={setBulkOpen} defaultSchool={school} defaultClassSection={classSection} />
      <ProfileRegisterDialog key={`profile-${dialogKey}`} open={profileOpen} onOpenChange={setProfileOpen} defaultSchool={school} defaultClassSection={classSection} />
      <SingleRegisterDialog key={`single-${dialogKey}`} student={registerTarget} school={school} onOpenChange={(o) => !o && setRegisterTarget(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title={`Delete ${deleteTarget?.name}'s face?`}
        description="The AI will no longer recognise this student in classroom photos until a new face is registered. Their profile photo is kept."
        confirmLabel="Delete face"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}
