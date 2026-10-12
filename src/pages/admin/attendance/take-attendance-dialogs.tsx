import { useEffect, useState, type FormEvent } from "react"
import { ClipboardPen, LoaderCircle, ScanFace, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useObjectUrls } from "@/hooks/use-object-urls"
import { ApiError } from "@/lib/api"
import { sessionsApi } from "@/lib/endpoints"
import { isoDate } from "@/lib/format"
import { runJob } from "@/lib/jobs"
import type { AIJob, AttendanceSessionDetail } from "@/lib/types"

/** Taking attendance also marks the day as working in the academic calendar, so working days are refreshed too. */
const INVALIDATE = [["sessions"], ["session"], ["dashboard"], ["working-days"]]
const MAX_PHOTOS = 5

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (session: AttendanceSessionDetail) => void
  defaultSchool?: number | null
  defaultClassSection?: number | null
}

/** Form state starts from the list filters; the parent remounts the dialog (via `key`) each time it opens. */
function useTargetState(defaultSchool?: number | null, defaultClassSection?: number | null) {
  const [school, setSchool] = useState<number | null>(defaultSchool ?? null)
  const [classSection, setClassSection] = useState<number | null>(defaultSchool ? (defaultClassSection ?? null) : null)
  const [date, setDate] = useState(isoDate())

  return { school, setSchool, classSection, setClassSection, date, setDate }
}

function TargetFields({
  t,
  errors,
  idPrefix,
}: {
  t: ReturnType<typeof useTargetState>
  errors: Record<string, string>
  idPrefix: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="School" htmlFor={`${idPrefix}-school`} required error={errors.school} className="sm:col-span-2">
        <SchoolPicker
          id={`${idPrefix}-school`}
          value={t.school}
          onChange={(v) => {
            t.setSchool(v)
            t.setClassSection(null)
          }}
          invalid={!!errors.school}
        />
      </Field>
      <Field label="Class section" htmlFor={`${idPrefix}-cs`} required error={errors.class_section}>
        <ClassSectionSelect
          id={`${idPrefix}-cs`}
          school={t.school}
          value={t.classSection}
          onChange={t.setClassSection}
          invalid={!!errors.class_section}
        />
      </Field>
      <Field label="Date" htmlFor={`${idPrefix}-date`} required error={errors.date} hint="Today or a past school day">
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={t.date}
          max={isoDate()}
          onChange={(e) => t.setDate(e.target.value)}
          aria-invalid={!!errors.date || undefined}
          className="h-9"
          required
        />
      </Field>
    </div>
  )
}

type VerifyJob = AIJob<{ session: number }>

const STEPS = ["Uploading classroom photos", "Waiting for the face recognition service", "Recognising faces", "Saving the draft attendance"]

/** Where the verification job is, from the server's own status. */
function stepOf(job: VerifyJob | null) {
  if (!job) return 0
  if (job.status === "PENDING") return 1
  if (job.status === "RUNNING") return 2
  return 3
}

function RecognisingState({ files, job }: { files: File[]; job: VerifyJob | null }) {
  const [elapsed, setElapsed] = useState(0)
  const urls = useObjectUrls(files)
  const step = stepOf(job)

  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid gap-5 py-2"
      role="status"
      aria-live="polite"
    >
      <div className="relative mx-auto flex size-24 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-3xl bg-primary/15"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <ScanFace className="size-9" />
          <motion.span
            className="absolute inset-x-2 h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]"
            animate={{ top: ["15%", "85%", "15%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </div>

      <div className="text-center">
        <p className="font-semibold">Recognising faces</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={job?.message || STEPS[step]}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 text-sm text-muted-foreground"
          >
            {job?.message || STEPS[step]}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {elapsed}s elapsed. This can take a few minutes for large classes; keep this window open.
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {urls.map((u, i) => (
          <div key={u} className="relative size-14 overflow-hidden rounded-lg border bg-muted">
            <img src={u} alt={`Classroom photo ${i + 1} being scanned`} className="size-full object-cover opacity-80" />
            <motion.span
              className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-primary/40 to-transparent"
              animate={{ top: ["-35%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.25 }}
            />
          </div>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-xs gap-1.5">
        {STEPS.map((s, i) => (
          <motion.span
            key={s}
            className="h-1 flex-1 rounded-full bg-muted"
            animate={{ backgroundColor: i <= step ? "var(--primary)" : "var(--muted)" }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

/** Takes attendance from class photos. Recognition runs as a background job on the server, which is polled before the saved draft is loaded. */
export function AiAttendanceDialog({
  open,
  onOpenChange,
  onDone,
  defaultSchool,
  defaultClassSection,
  onSwitchToManual,
}: DialogProps & { onSwitchToManual?: () => void }) {
  const t = useTargetState(defaultSchool, defaultClassSection)
  const [files, setFiles] = useState<File[]>([])
  const [unavailable, setUnavailable] = useState(false)
  const [progress, setProgress] = useState<VerifyJob | null>(null)
  const errors = useFormErrors()

  const mutation = useApiMutation(
    async () => {
      setProgress(null)
      const { message, data } = await runJob(
        sessionsApi.verify({ images: files, school: t.school, class_section: t.classSection, date: t.date }),
        setProgress
      )
      return { message, data: await sessionsApi.get(data.session) }
    },
    {
      invalidate: INVALIDATE,
      toastError: false,
      onError: (err) => {
        errors.capture(err)
        setUnavailable(err instanceof ApiError && err.status === 503)
      },
      onSuccess: (data) => {
        onOpenChange(false)
        onDone(data)
      },
    }
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    setUnavailable(false)
    mutation.mutate()
  }

  const imageError = Object.entries(errors.fields).find(([k]) => k.startsWith("images"))?.[1]
  const aiRejected = errors.fields.ai_service
  const formMessage = unavailable
    ? "The AI face recognition service is unavailable right now. Try again in a few minutes, or take attendance manually."
    : (errors.form ?? (aiRejected ? `The AI service could not process the photos: ${aiRejected}` : null))
  const canSubmit = !!t.school && !!t.classSection && !!t.date && files.length > 0

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl" showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Take attendance with AI
          </DialogTitle>
          <DialogDescription>
            Upload 1 to {MAX_PHOTOS} clear classroom photos. Students whose faces are recognised are marked present, everyone else absent. The
            result is saved as a draft you can review.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {mutation.isPending ? (
            <RecognisingState key="pending" files={files} job={progress} />
          ) : (
            <motion.form
              key="form"
              id="ai-attendance-form"
              onSubmit={submit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4"
            >
              <FormAlert message={formMessage} />
              {(unavailable || !!aiRejected) && onSwitchToManual && (
                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onSwitchToManual}>
                  <ClipboardPen /> Take attendance manually
                </Button>
              )}
              <TargetFields t={t} errors={errors.fields} idPrefix="ai" />
              <Field label="Classroom photos" required error={imageError} hint={`${files.length} of ${MAX_PHOTOS} photos. Wide shots with faces visible work best.`}>
                <FileDropzone
                  files={files}
                  onChange={setFiles}
                  accept="image/*"
                  multiple
                  maxFiles={MAX_PHOTOS}
                  preview
                  invalid={!!imageError}
                  label="Drop classroom photos here or click to browse"
                  hint="JPG or PNG, up to 5 photos"
                />
              </Field>
            </motion.form>
          )}
        </AnimatePresence>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="ai-attendance-form" disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <ScanFace />}
            {mutation.isPending ? "Recognising" : "Recognise faces"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ManualAttendanceDialog({ open, onOpenChange, onDone, defaultSchool, defaultClassSection }: DialogProps) {
  const t = useTargetState(defaultSchool, defaultClassSection)
  const errors = useFormErrors()

  const mutation = useApiMutation(
    () => sessionsApi.createManual({ school: t.school, class_section: t.classSection, date: t.date }),
    {
      invalidate: INVALIDATE,
      toastError: false,
      onError: errors.capture,
      onSuccess: (data) => {
        onOpenChange(false)
        onDone(data)
      },
    }
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPen className="size-4 text-primary" /> Manual attendance
          </DialogTitle>
          <DialogDescription>
            Creates a draft with every student marked absent. You then mark who is present on the next screen and lock it when done.
          </DialogDescription>
        </DialogHeader>
        <form id="manual-attendance-form" onSubmit={submit} className="grid gap-4">
          <FormAlert message={errors.form ?? errors.fields.records} />
          <TargetFields t={t} errors={errors.fields} idPrefix="manual" />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="manual-attendance-form" disabled={mutation.isPending || !t.school || !t.classSection || !t.date}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
