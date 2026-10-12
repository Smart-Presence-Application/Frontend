import { CircleCheck, CircleX } from "lucide-react"

import { PersonAvatar, Pill } from "@/components/admin/ui-bits"
import { classSectionLabel, formatDate, timeAgo } from "@/lib/format"
import type { AttendanceAlert, PresenceStatus, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PresencePill({ status }: { status: PresenceStatus }) {
  return status === "PRESENT" ? (
    <Pill tone="green">
      <CircleCheck className="size-3" /> Present
    </Pill>
  ) : (
    <Pill tone="red">
      <CircleX className="size-3" /> Absent
    </Pill>
  )
}

/** Switches between a parent's children; hidden when there is only one. */
export function ChildPicker({ students, value, onChange }: { students: Student[]; value: number | null; onChange: (id: number) => void }) {
  if (students.length < 2) return null
  return (
    <div role="tablist" aria-label="Choose a child" className="flex flex-wrap gap-2">
      {students.map((s) => {
        const active = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border bg-card py-1.5 pr-4 pl-1.5 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "hover:border-primary/40"
            )}
          >
            <PersonAvatar name={s.name} src={s.profile_image} className="size-8" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{s.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{classSectionLabel(s.class_section_detail)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** One attendance alert; clicking it marks it read. */
export function AlertRow({ alert, onRead }: { alert: AttendanceAlert; onRead?: () => void }) {
  const present = alert.status === "PRESENT"
  return (
    <button
      type="button"
      onClick={onRead}
      className={cn("flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50", !alert.is_read && "bg-primary/[0.03]")}
    >
      <span className="relative">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            present ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}
        >
          {present ? <CircleCheck className="size-5" /> : <CircleX className="size-5" />}
        </span>
        {!alert.is_read && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary ring-2 ring-card" aria-label="Unread" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("truncate text-sm", !alert.is_read ? "font-semibold" : "font-medium text-muted-foreground")}>{alert.title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {alert.student_name} · {formatDate(alert.date)}
        </p>
        {alert.message && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{alert.message}</p>}
      </div>
      <span className="hidden sm:block">
        <PresencePill status={alert.status} />
      </span>
    </button>
  )
}
