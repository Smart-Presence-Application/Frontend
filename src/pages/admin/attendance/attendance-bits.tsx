import { CircleCheck, CircleX, Lock, PencilLine } from "lucide-react"
import { motion } from "motion/react"

import { Pill } from "@/components/admin/ui-bits"
import type { FaceRegisterResult, SessionStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { percentOf } from "./utils"

export function SessionStatusPill({ status }: { status: SessionStatus }) {
  return status === "LOCKED" ? (
    <Pill tone="green">
      <Lock className="size-3" /> Locked
    </Pill>
  ) : (
    <Pill tone="amber">
      <PencilLine className="size-3" /> Draft
    </Pill>
  )
}

/** Present / absent counts with a slim bar showing the attendance percentage. */
export function AttendanceBar({ present, absent, total }: { present: number | null; absent: number | null; total: number | null }) {
  const pct = percentOf(present, total)
  return (
    <div className="min-w-32">
      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
        <span>
          <span className="font-semibold text-primary">{present ?? "-"}</span>
          <span className="text-muted-foreground"> / </span>
          <span className="font-semibold text-destructive">{absent ?? "-"}</span>
          <span className="text-muted-foreground"> of {total ?? "-"}</span>
        </span>
        <span className="text-xs font-medium text-muted-foreground">{pct === null ? "-" : `${pct}%`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", pct !== null && pct < 75 ? "bg-amber-500" : "bg-primary")}
          initial={{ width: 0 }}
          animate={{ width: `${pct ?? 0}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

export function FaceResultTable({ result }: { result: FaceRegisterResult }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Total", value: result.total, cls: "text-foreground" },
          { label: "Registered", value: result.registered, cls: "text-primary" },
          { label: "Failed", value: result.failed, cls: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-muted/30 px-2 py-2.5">
            <p className={cn("text-xl font-bold tabular-nums", s.cls)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      {result.results.length > 0 && (
        <div className="max-h-72 overflow-y-auto rounded-xl border">
          <ul className="divide-y">
            {result.results.map((r, i) => (
              <motion.li
                key={`${r.label}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="flex items-start gap-3 px-3 py-2.5 text-sm"
              >
                {r.registered ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : (
                  <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.label}</p>
                  {r.student_id && r.student_id !== r.label && <p className="font-mono text-xs text-muted-foreground">{r.student_id}</p>}
                  {r.error && <p className="text-xs text-destructive">{r.error}</p>}
                </div>
                <Pill tone={r.registered ? "green" : "red"}>{r.registered ? "Registered" : "Failed"}</Pill>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
