import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CalendarCheck,
  CheckCheck,
  CircleCheck,
  CircleX,
  ImageIcon,
  LoaderCircle,
  Lock,
  LockOpen,
  Percent,
  RotateCcw,
  Save,
  ScanFace,
  Search,
  Trash2,
  UserX,
  Users,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { EmptyState, ErrorState } from "@/components/admin/states"
import { Panel, Pill, StatCard } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { sessionsApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate, formatDateTime } from "@/lib/format"
import type { AttendanceRecord, AttendanceSessionDetail, PresenceStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SessionStatusPill } from "./attendance-bits"
import { percentOf } from "./utils"
import { panelPath } from "@/lib/panel"

type Edit = { status: PresenceStatus; remarks: string }
const INVALIDATE = [["sessions"], ["session"], ["dashboard"]]

function similarityPct(value: number | null) {
  if (value === null || value === undefined) return null
  return Math.round(value <= 1 ? value * 100 : value)
}

function Ring({ value }: { value: number | null }) {
  const r = 26
  const c = 2 * Math.PI * r
  const pct = value ?? 0
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
      <motion.circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className={pct < 75 ? "stroke-amber-500" : "stroke-primary"}
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (pct / 100) * c }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

function StatusToggle({ value, onChange, disabled, id }: { value: PresenceStatus; onChange: (v: PresenceStatus) => void; disabled?: boolean; id: number }) {
  const options: { value: PresenceStatus; label: string; icon: typeof CircleCheck }[] = [
    { value: "PRESENT", label: "Present", icon: CircleCheck },
    { value: "ABSENT", label: "Absent", icon: CircleX },
  ]
  return (
    <div role="radiogroup" aria-label="Attendance status" className="inline-flex rounded-lg bg-muted p-0.5" onClick={(e) => e.stopPropagation()}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors disabled:opacity-60",
              active ? (o.value === "PRESENT" ? "text-primary-foreground" : "text-white") : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className={cn("absolute inset-0 rounded-md shadow-sm", o.value === "PRESENT" ? "bg-primary" : "bg-destructive")}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <o.icon className="relative size-3.5" />
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}

export default function SessionDetailPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const query = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => sessionsApi.get(sessionId),
    enabled: Number.isFinite(sessionId),
  })

  if (query.isLoading) return <DetailSkeleton />
  if (query.error || !query.data)
    return (
      <>
        <PageHeader title="Attendance" backTo={panelPath("/admin/attendance")} />
        <Panel>
          <ErrorState error={query.error} onRetry={query.refetch} />
        </Panel>
      </>
    )
  return <SessionView session={query.data} refreshing={query.isFetching} />
}

/** Editable attendance session. Teachers edit drafts only; unlocking and deleting are left to admins. Warns before leaving with unsaved edits, and after a delete drops the cached detail instead of refetching a session that no longer exists. */
function SessionView({ session, refreshing }: { session: AttendanceSessionDetail; refreshing: boolean }) {
  const [edits, setEdits] = useState<Record<number, Edit>>({})
  const [search, setSearch] = useState("")
  const [confirm, setConfirm] = useState<"save" | "lock" | "unlock" | "delete" | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locked = session.status === "LOCKED"
  const isTeacher = usePanel().kind === "teacher"
  const readOnly = locked && isTeacher

  const original = useMemo(() => new Map(session.records.map((r) => [r.student, r])), [session.records])
  const changed = Object.keys(edits).length
  const dirty = changed > 0

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  function current(r: AttendanceRecord): Edit {
    return edits[r.student] ?? { status: r.status, remarks: r.remarks ?? "" }
  }

  function setEdit(student: number, patch: Partial<Edit>) {
    setEdits((prev) => {
      const base = original.get(student)
      if (!base) return prev
      const next: Edit = { ...(prev[student] ?? { status: base.status, remarks: base.remarks ?? "" }), ...patch }
      const copy = { ...prev }
      if (next.status === base.status && next.remarks === (base.remarks ?? "")) delete copy[student]
      else copy[student] = next
      return copy
    })
  }

  function markAll(status: PresenceStatus) {
    setEdits((prev) => {
      const copy: Record<number, Edit> = {}
      for (const r of session.records) {
        const remarks = prev[r.student]?.remarks ?? r.remarks ?? ""
        if (status !== r.status || remarks !== (r.remarks ?? "")) copy[r.student] = { status, remarks }
      }
      return copy
    })
  }

  const records = session.records.map((r) => ({ ...r, ...current(r) }))
  const present = records.filter((r) => r.status === "PRESENT").length
  const total = records.length
  const absent = total - present
  const pct = percentOf(present, total)

  const term = search.trim().toLowerCase()
  const visible = term
    ? records.filter((r) => [r.student_name, r.student_id, r.roll_number].some((v) => v?.toLowerCase().includes(term)))
    : records

  const saveMutation = useApiMutation(
    () =>
      sessionsApi.updateRecords(
        session.id,
        Object.entries(edits).map(([student, e]) => ({ student: Number(student), status: e.status, remarks: e.remarks }))
      ),
    {
      invalidate: INVALIDATE,
      onSuccess: () => {
        setEdits({})
        setConfirm(null)
      },
    }
  )
  const lockMutation = useApiMutation(() => sessionsApi.lock(session.id), { invalidate: INVALIDATE, onSuccess: () => setConfirm(null) })
  const unlockMutation = useApiMutation(() => sessionsApi.unlock(session.id), { invalidate: INVALIDATE, onSuccess: () => setConfirm(null) })
  const deleteMutation = useApiMutation(() => sessionsApi.remove(session.id), {
    invalidate: [["sessions"], ["dashboard"]],
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["session", session.id] })
      navigate(panelPath("/admin/attendance"), { replace: true })
    },
  })

  function save() {
    if (locked) setConfirm("save")
    else saveMutation.mutate()
  }

  const columns: Column<(typeof records)[number]>[] = [
    {
      key: "roll",
      header: "Roll",
      className: "w-16",
      cell: (r) => <span className="font-mono text-sm tabular-nums">{r.roll_number || "-"}</span>,
    },
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          {edits[r.student] && <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved change" />}
          <div className="min-w-0">
            <p className="truncate font-medium">{r.student_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{r.student_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusToggle id={r.student} value={r.status} onChange={(status) => setEdit(r.student, { status })} disabled={saveMutation.isPending || readOnly} />,
    },
    {
      key: "source",
      header: "Source",
      hideBelow: "md",
      cell: (r) => (
        <Pill tone={r.source === "AI" ? "green" : "gray"}>
          {r.source === "AI" ? <ScanFace className="size-3" /> : null}
          {r.source === "AI" ? "AI" : "Manual"}
        </Pill>
      ),
    },
    {
      key: "ai",
      header: "AI result",
      hideBelow: "lg",
      cell: (r) => {
        const sim = similarityPct(r.similarity)
        if (!r.ai_status) return <span className="text-xs text-muted-foreground">-</span>
        return (
          <div className="grid gap-0.5 text-xs">
            <span className={cn("font-medium", r.ai_status === "PRESENT" ? "text-primary" : "text-destructive")}>
              {r.ai_status === "PRESENT" ? "Recognised" : "Not found"}
            </span>
            {sim !== null && <span className="text-muted-foreground tabular-nums">{sim}% match</span>}
          </div>
        )
      },
    },
    {
      key: "face",
      header: "Face",
      hideBelow: "lg",
      cell: (r) =>
        r.face_registered ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ScanFace className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Face registered</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserX className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>No face registered, AI cannot recognise this student</TooltipContent>
          </Tooltip>
        ),
    },
    {
      key: "remarks",
      header: "Remarks",
      hideBelow: "md",
      className: "min-w-44",
      cell: (r) => (
        <Input
          value={r.remarks}
          maxLength={255}
          onChange={(e) => setEdit(r.student, { remarks: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Add remark"
          aria-label={`Remarks for ${r.student_name}`}
          disabled={saveMutation.isPending || readOnly}
          className="h-8 text-sm"
        />
      ),
    },
    {
      key: "updated_by",
      header: "Updated by",
      hideBelow: "xl",
      cell: (r) => <span className="text-xs text-muted-foreground">{r.updated_by_name ?? "-"}</span>,
    },
  ]

  const title = `${classSectionLabel(session.class_section_detail)}, ${formatDate(session.date)}`

  return (
    <div className={cn(dirty && "pb-24")}>
      <PageHeader
        title={title}
        seoTitle="Attendance detail"
        backTo={panelPath("/admin/attendance")}
        description={`${session.school_name}${session.class_section_detail ? ` · ${session.class_section_detail.academic_year_name}` : ""}`}
        actions={
          <>
            {readOnly ? (
              <SessionStatusPill status={session.status} />
            ) : locked ? (
              <Button variant="outline" className="h-9" onClick={() => setConfirm("unlock")} disabled={dirty}>
                <LockOpen /> Unlock
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={dirty ? 0 : -1}>
                    <Button className="h-9 shadow-md shadow-primary/20" onClick={() => setConfirm("lock")} disabled={dirty}>
                      <Lock /> Lock attendance
                    </Button>
                  </span>
                </TooltipTrigger>
                {dirty && <TooltipContent>Save or discard your changes first</TooltipContent>}
              </Tooltip>
            )}
            {!isTeacher && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon-lg" onClick={() => setConfirm("delete")} aria-label="Delete attendance">
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete attendance</TooltipContent>
              </Tooltip>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Present" value={present} icon={CircleCheck} index={0} hint={dirty ? "Includes unsaved changes" : undefined} />
        <StatCard label="Absent" value={absent} icon={CircleX} index={1} />
        <StatCard label="Total students" value={total} icon={Users} index={2} />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-xs"
        >
          <div>
            <p className="text-sm font-medium text-muted-foreground">Attendance</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">{pct === null ? "-" : `${pct}%`}</p>
          </div>
          <div className="relative">
            <Ring value={pct} />
            <Percent className="absolute inset-0 m-auto size-4 text-muted-foreground" />
          </div>
        </motion.div>
        <StatCard
          label="Faces not registered"
          value={session.not_registered_count}
          icon={UserX}
          index={4}
          hint={session.not_registered_count > 0 ? "AI cannot recognise these students" : "Every student can be recognised"}
          to={panelPath(`/admin/faces?school=${session.school}&class_section=${session.class_section}&registered=false`)}
        />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="grid content-start gap-2 rounded-2xl border bg-card p-5 shadow-xs"
        >
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <SessionStatusPill status={session.status} />
          <p className="text-xs text-muted-foreground">
            {locked ? `By ${session.locked_by_name ?? "-"} on ${formatDateTime(session.locked_at)}` : `Taken by ${session.created_by_name ?? "-"}`}
          </p>
          {session.image_count > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5" /> {session.image_count} photos, {session.detected_faces} faces
            </p>
          )}
        </motion.div>
      </div>

      {locked && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
        >
          <Lock className="mt-0.5 size-4 shrink-0" />
          {readOnly
            ? "This attendance is locked and parents have been notified. Ask your school admin to unlock it if a record needs correcting."
            : "This attendance is locked and parents have been notified. You can still correct records as an admin, but saving will notify the parents of the changed students again."}
        </motion.p>
      )}

      <Panel
        toolbar={
          <>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID or roll number"
                aria-label="Search records"
                className="h-9 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" className="h-9" onClick={() => markAll("PRESENT")} disabled={saveMutation.isPending || readOnly || !total}>
                <CheckCheck /> Mark all present
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => markAll("ABSENT")} disabled={saveMutation.isPending || readOnly || !total}>
                <X /> Mark all absent
              </Button>
            </div>
          </>
        }
      >
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          loading={refreshing}
          empty={
            <EmptyState
              icon={term ? Search : CalendarCheck}
              title={term ? "No students match your search" : "No records in this attendance"}
              description={term ? "Try a different name, ID or roll number." : undefined}
            />
          }
        />
      </Panel>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4"
          >
            <p className="text-sm">
              <span className="font-semibold">{changed}</span> unsaved change{changed === 1 ? "" : "s"}
              {locked && <span className="block text-xs text-muted-foreground">Parents of these students will be notified.</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setEdits({})} disabled={saveMutation.isPending}>
                <RotateCcw /> Discard
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={save} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
                Save changes ({changed})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirm === "save"}
        onOpenChange={(o) => !o && setConfirm(null)}
        icon={Save}
        title={`Save ${changed} change${changed === 1 ? "" : "s"} to locked attendance?`}
        description="This attendance is already locked. Saving updates the records and notifies the parents of every changed student with the corrected status."
        confirmLabel="Save and notify parents"
        loading={saveMutation.isPending}
        onConfirm={() => saveMutation.mutate()}
      />
      <ConfirmDialog
        open={confirm === "lock"}
        onOpenChange={(o) => !o && setConfirm(null)}
        icon={Lock}
        title="Lock this attendance?"
        description={`This finalises attendance for ${title} (${present} present, ${absent} absent) and notifies parents. Teachers can no longer edit it.`}
        confirmLabel="Lock and notify parents"
        loading={lockMutation.isPending}
        onConfirm={() => lockMutation.mutate()}
      />
      <ConfirmDialog
        open={confirm === "unlock"}
        onOpenChange={(o) => !o && setConfirm(null)}
        icon={LockOpen}
        title="Unlock this attendance?"
        description="It returns to draft so the class teacher can edit it again. Parents are notified again when it is locked."
        confirmLabel="Unlock"
        loading={unlockMutation.isPending}
        onConfirm={() => unlockMutation.mutate()}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        destructive
        icon={Trash2}
        title="Delete this attendance?"
        description={`The session and all ${session.records.length} student records are removed permanently.${
          locked ? " It is locked: notifications parents already received stay in their inbox." : ""
        }${dirty ? " Your unsaved changes are discarded too." : ""}`}
        confirmLabel="Delete attendance"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
