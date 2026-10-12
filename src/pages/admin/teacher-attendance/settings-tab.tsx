import { useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { LoaderCircle, Save, School, SlidersHorizontal } from "lucide-react"
import { motion } from "motion/react"

import { SchoolPicker } from "@/components/admin/pickers"
import { EmptyState, ErrorState, FormAlert } from "@/components/admin/states"
import { Field, Panel } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import type { useUrlState } from "@/hooks/use-url-state"
import { teacherAttendanceApi } from "@/lib/endpoints"
import type { TeacherAttendanceSettings } from "@/lib/types"
import { durationLabel } from "./utils"

const MAX = 1440
const HALF_SHORTER = "A half day must be shorter than a full day."

function hoursHint(value: string) {
  const n = Number(value)
  if (!value || !Number.isInteger(n)) return "Whole minutes, 1 to 1440"
  if (n < 1 || n > MAX) return "Must be between 1 and 1440 minutes"
  return `${durationLabel(n)} (${(n / 60).toFixed(2).replace(/\.?0+$/, "")} hours)`
}

export function SettingsTab({ url }: { url: ReturnType<typeof useUrlState> }) {
  const school = Number(url.get("school")) || null
  const query = useQuery({
    queryKey: ["teacher-attendance-settings", school],
    queryFn: () => teacherAttendanceApi.settings(school!),
    enabled: !!school,
  })

  return (
    <Panel toolbar={<SchoolPicker value={school} onChange={(v) => url.set({ school: v, teacher: null })} className="h-9 w-full sm:w-60" />}>
      {!school ? (
        <EmptyState icon={School} title="Pick a school" description="Each school sets how many hours count as a full day and a half day." />
      ) : query.isLoading ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : query.error || !query.data ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <SettingsForm key={school} school={school} settings={query.data} />
      )}
    </Panel>
  )
}

function SettingsForm({ school, settings }: { school: number; settings: TeacherAttendanceSettings }) {
  const [full, setFull] = useState(String(settings.full_day_minutes))
  const [half, setHalf] = useState(String(settings.half_day_minutes))
  const errors = useFormErrors()

  const mutation = useApiMutation(
    () => teacherAttendanceApi.updateSettings({ school, full_day_minutes: Number(full), half_day_minutes: Number(half) }),
    {
      invalidate: [["teacher-attendance-settings"]],
      toastError: false,
      onError: errors.capture,
    }
  )

  const fullN = Number(full)
  const halfN = Number(half)
  const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX
  const orderError = inRange(fullN) && inRange(halfN) && halfN >= fullN ? HALF_SHORTER : undefined
  const dirty = fullN !== settings.full_day_minutes || halfN !== settings.half_day_minutes
  const valid = inRange(fullN) && inRange(halfN) && !orderError

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    if (valid) mutation.mutate()
  }

  const fullPct = inRange(fullN) ? (fullN / MAX) * 100 : 0
  const halfPct = inRange(halfN) ? (halfN / MAX) * 100 : 0

  return (
    <form onSubmit={submit} className="grid gap-5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SlidersHorizontal className="size-5" />
        </span>
        <div>
          <p className="font-semibold">Working day rules</p>
          <p className="text-sm text-muted-foreground">
            Time worked at or above the full day threshold is a full day, at or above the half day threshold a half day, and anything less is
            absent. Changes apply to days verified from now on.
          </p>
        </div>
      </div>

      <FormAlert message={errors.form} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full day (minutes)" htmlFor="full_day_minutes" required error={errors.fields.full_day_minutes} hint={hoursHint(full)}>
          <Input
            id="full_day_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX}
            step={1}
            value={full}
            onChange={(e) => setFull(e.target.value)}
            className="h-9"
            required
          />
        </Field>
        <Field
          label="Half day (minutes)"
          htmlFor="half_day_minutes"
          required
          error={orderError ?? errors.fields.half_day_minutes}
          hint={hoursHint(half)}
        >
          <Input
            id="half_day_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX}
            step={1}
            value={half}
            onChange={(e) => setHalf(e.target.value)}
            aria-invalid={!!orderError || undefined}
            className="h-9"
            required
          />
        </Field>
      </div>

      <div className="grid gap-1.5" aria-hidden="true">
        <div className="relative h-3 overflow-hidden rounded-full bg-destructive/15">
          <motion.div className="absolute inset-y-0 left-0 bg-amber-500/50" animate={{ width: `${fullPct}%` }} transition={{ duration: 0.3 }} />
          <motion.div className="absolute inset-y-0 left-0 bg-destructive/40" animate={{ width: `${halfPct}%` }} transition={{ duration: 0.3 }} />
          <motion.div className="absolute inset-y-0 right-0 bg-primary/60" animate={{ width: `${100 - fullPct}%` }} transition={{ duration: 0.3 }} />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Absent below {durationLabel(inRange(halfN) ? halfN : null)}</span>
          <span>Half day</span>
          <span>Full day from {durationLabel(inRange(fullN) ? fullN : null)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!dirty || mutation.isPending}
          onClick={() => {
            setFull(String(settings.full_day_minutes))
            setHalf(String(settings.half_day_minutes))
            errors.reset()
          }}
        >
          Reset
        </Button>
        <Button type="submit" disabled={!dirty || !valid || mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Save settings
        </Button>
      </div>
    </form>
  )
}
