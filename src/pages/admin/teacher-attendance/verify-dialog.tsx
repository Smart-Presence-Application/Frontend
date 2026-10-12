import { useState, type FormEvent } from "react"
import { BadgeCheck, CloudOff, LoaderCircle, TriangleAlert } from "lucide-react"
import { motion } from "motion/react"

import { FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { teacherAttendanceApi } from "@/lib/endpoints"
import { formatDate, formatTime } from "@/lib/format"
import type { TeacherAttendanceRecord } from "@/lib/types"
import { DayTypePill, PhotoPanel, TeacherStatusPill } from "./bits"
import { DAY_TYPE_LABEL, durationLabel, toHHMM } from "./utils"

const AUTO = "__auto__"
const NOT_CHECKED_OUT = "has not checked out"

function minutesBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number)
  const [bh, bm] = b.split(":").map(Number)
  return bh * 60 + bm - (ah * 60 + am)
}

/** Verifies a teacher's attendance record. The parent remounts it (via `key`) for each record, so state starts from the record. Only times the admin changed are sent, so captured times stay the record of truth. */
export function VerifyDialog({ record, onOpenChange }: { record: TeacherAttendanceRecord | null; onOpenChange: (open: boolean) => void }) {
  const open = !!record
  const initialIn = toHHMM(record?.check_in_at)
  const initialOut = toHHMM(record?.check_out_at)
  const [checkIn, setCheckIn] = useState(initialIn)
  const [checkOut, setCheckOut] = useState(initialOut)
  const [dayType, setDayType] = useState<string>(record?.day_type_overridden && record.day_type ? record.day_type : AUTO)
  const [remarks, setRemarks] = useState(record?.remarks ?? "")
  const errors = useFormErrors()

  const mutation = useApiMutation(
    () => {
      const body: Record<string, unknown> = { day_type: dayType === AUTO ? null : dayType, remarks }
      if (checkIn && checkIn !== initialIn) body.check_in_time = checkIn
      if (checkOut && checkOut !== initialOut) body.check_out_time = checkOut
      return teacherAttendanceApi.verify(record!.id, body)
    },
    {
      invalidate: [["teacher-attendance"], ["teacher-attendance-summary"], ["dashboard"]],
      toastError: false,
      onError: errors.capture,
      onSuccess: () => onOpenChange(false),
    }
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    mutation.mutate()
  }

  const missingCheckOut = !record?.check_out_at
  const checkOutError = errors.fields.check_out_time
  const needsCheckOut = (checkOutError?.includes(NOT_CHECKED_OUT) ?? false) || (missingCheckOut && !checkOut)
  const preview = checkIn && checkOut ? minutesBetween(checkIn, checkOut) : null

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-primary" /> Verify attendance
          </DialogTitle>
          <DialogDescription>
            {record?.teacher_name} ({record?.employee_id}) on {formatDate(record?.date)}. Check the photos, adjust times if needed and finalise the
            day.
          </DialogDescription>
        </DialogHeader>

        {record && (
          <form id="verify-form" onSubmit={submit} className="grid gap-5">
            <FormAlert message={errors.form} />

            {(record.check_in_offline || record.check_out_offline) && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                <CloudOff className="mt-0.5 size-4 shrink-0" />
                <span>
                  The {record.check_in_offline && record.check_out_offline ? "check-in and check-out were" : record.check_in_offline ? "check-in was" : "check-out was"} taken
                  without internet and uploaded later, so the captured time comes from the teacher&apos;s device. Compare it with the photo before verifying.
                </span>
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <PhotoPanel src={record.check_in_image} label="Check-in photo" capturedAt={record.check_in_captured_at} />
              <PhotoPanel src={record.check_out_image} label="Check-out photo" capturedAt={record.check_out_captured_at} />
            </div>

            <div className="overflow-hidden rounded-xl border text-sm">
              <div className="grid grid-cols-3 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span />
                <span>Check-in</span>
                <span>Check-out</span>
              </div>
              <div className="grid grid-cols-3 border-t px-3 py-2">
                <span className="text-muted-foreground">Captured</span>
                <span className="tabular-nums">
                  {formatTime(record.check_in_captured_at)}
                  {record.check_in_offline && <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(offline)</span>}
                </span>
                <span className="tabular-nums">
                  {formatTime(record.check_out_captured_at)}
                  {record.check_out_offline && <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(offline)</span>}
                </span>
              </div>
              <div className="grid grid-cols-3 border-t px-3 py-2">
                <span className="text-muted-foreground">Adjusted</span>
                <span className="tabular-nums">{formatTime(record.check_in_verified_at)}</span>
                <span className="tabular-nums">{formatTime(record.check_out_verified_at)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">
                  Worked <span className="font-medium text-foreground">{durationLabel(record.worked_minutes)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <DayTypePill value={record.day_type} overridden={record.day_type_overridden} />
                  <TeacherStatusPill status={record.status} />
                </span>
              </div>
            </div>

            {needsCheckOut && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                The teacher has not checked out. Enter the time they left school as the check-out time to verify this day.
              </motion.p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Check-in time" htmlFor="v-in" error={errors.fields.check_in_time} hint="Change only to credit duty outside school">
                <Input id="v-in" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="h-9" />
              </Field>
              <Field
                label="Check-out time"
                htmlFor="v-out"
                required={missingCheckOut}
                error={checkOutError}
                hint={preview !== null ? (preview > 0 ? `Worked ${durationLabel(preview)}` : "Must be after check-in") : undefined}
              >
                <Input
                  id="v-out"
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  aria-invalid={!!checkOutError || undefined}
                  className="h-9"
                  required={missingCheckOut}
                />
              </Field>
              <Field label="Day type" htmlFor="v-type" error={errors.fields.day_type} hint="Automatic uses the school's hour settings">
                <Select value={dayType} onValueChange={setDayType}>
                  <SelectTrigger id="v-type" className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO}>Automatic from hours</SelectItem>
                    {Object.entries(DAY_TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Remarks" htmlFor="v-remarks" error={errors.fields.remarks} className="sm:col-span-2">
                <Textarea
                  id="v-remarks"
                  rows={2}
                  maxLength={255}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional note, e.g. left early for a school event"
                />
              </Field>
            </div>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="verify-form" disabled={mutation.isPending || (missingCheckOut && !checkOut)}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />}
            {record?.status === "VERIFIED" ? "Verify again" : "Verify day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
