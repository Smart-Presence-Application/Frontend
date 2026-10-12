import { useState } from "react"
import { BadgeCheck, Camera, Clock, ImageOff } from "lucide-react"

import { AsyncCombobox } from "@/components/admin/combobox"
import { Pill } from "@/components/admin/ui-bits"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { teachersApi } from "@/lib/endpoints"
import { formatDateTime } from "@/lib/format"
import type { TeacherAttendanceStatus, WorkDayType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DAY_TYPE_LABEL } from "./utils"

const DAY_TYPE_TONE = { FULL_DAY: "green", HALF_DAY: "amber", ABSENT: "red" } as const

export function DayTypePill({ value, overridden }: { value: WorkDayType | null; overridden?: boolean }) {
  if (!value) return <span className="text-xs text-muted-foreground">Pending</span>
  return (
    <Pill tone={DAY_TYPE_TONE[value]} dot>
      {DAY_TYPE_LABEL[value]}
      {overridden && <span className="opacity-70">(set)</span>}
    </Pill>
  )
}

export function TeacherStatusPill({ status }: { status: TeacherAttendanceStatus }) {
  return status === "VERIFIED" ? (
    <Pill tone="green">
      <BadgeCheck className="size-3" /> Verified
    </Pill>
  ) : (
    <Pill tone="amber">
      <Clock className="size-3" /> Awaiting review
    </Pill>
  )
}

/** Thumbnail that opens the photo full size. */
export function PhotoThumb({ src, label, className }: { src: string | null; label: string; className?: string }) {
  const [open, setOpen] = useState(false)
  if (!src)
    return (
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground", className)} title="No photo">
        <ImageOff className="size-4" />
      </span>
    )
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label={`View ${label}`}
        className={cn(
          "group relative size-9 shrink-0 overflow-hidden rounded-lg border bg-muted transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          className
        )}
      >
        <img src={src} alt={label} loading="lazy" className="size-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-3.5" />
        </span>
      </button>
      <PhotoLightbox src={src} label={label} open={open} onOpenChange={setOpen} />
    </>
  )
}

function PhotoLightbox({ src, label, open, onOpenChange, sub }: { src: string; label: string; open: boolean; onOpenChange: (o: boolean) => void; sub?: string | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          {sub && <DialogDescription>{sub}</DialogDescription>}
        </DialogHeader>
        <img src={src} alt={label} className="max-h-[70dvh] w-full rounded-xl bg-muted object-contain" />
      </DialogContent>
    </Dialog>
  )
}

/** Large photo with the captured time, used in the verify dialog. */
export function PhotoPanel({ src, label, capturedAt }: { src: string | null; label: string; capturedAt: string | null }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {src ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="aspect-[4/3] overflow-hidden rounded-xl border bg-muted transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label={`Enlarge ${label}`}
          >
            <img src={src} alt={label} className="size-full object-cover" />
          </button>
          <PhotoLightbox src={src} label={label} sub={capturedAt ? `Captured ${formatDateTime(capturedAt)}` : null} open={open} onOpenChange={setOpen} />
        </>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-muted/40 text-center text-xs text-muted-foreground">
          <ImageOff className="size-5" />
          No photo yet
        </div>
      )}
    </div>
  )
}

export function TeacherPicker({ school, value, onChange, className }: { school: number | null; value: number | null; onChange: (v: number | null) => void; className?: string }) {
  return (
    <AsyncCombobox
      queryKey={`teacher-picker-${school ?? "all"}`}
      value={value}
      onChange={(v) => onChange(v)}
      fetchOptions={(search) =>
        teachersApi
          .list({ search, school, page_size: 30 })
          .then((d) => d.results.map((t) => ({ value: t.id, label: t.name, sub: `${t.employee_id} · ${t.school_name}` })))
      }
      resolve={(id) => teachersApi.get(id).then((t) => ({ value: t.id, label: t.name, sub: t.employee_id }))}
      placeholder="All teachers"
      searchPlaceholder="Search name or employee ID"
      emptyText="No teachers found."
      clearable
      className={className}
      aria-label="Teacher"
    />
  )
}
