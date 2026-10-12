import { useState, type FormEvent, type ReactNode } from "react"
import { FileImage, Images, LoaderCircle, ScanFace, UserRoundCheck } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { FormAlert } from "@/components/admin/states"
import { Field, PersonAvatar } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { facesApi } from "@/lib/endpoints"
import { isJob, runJob, waitForJob } from "@/lib/jobs"
import type { AIJob, FaceRegisterResult, FaceStatus } from "@/lib/types"
import { FaceResultTable } from "./attendance-bits"
import { faceResultFromError } from "./utils"

const INVALIDATE = [["faces"], ["students"], ["student"], ["dashboard"]]
const MAX_FACE_IMAGES = 100

interface ScopeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSchool?: number | null
  defaultClassSection?: number | null
}

/** School and optional class-section scope shared by the bulk dialogs. Starts from the page filters; the parent remounts each dialog (via `key`) when it opens. */
function useScope(defaultSchool?: number | null, defaultClassSection?: number | null) {
  const [school, setSchool] = useState<number | null>(defaultSchool ?? null)
  const [classSection, setClassSection] = useState<number | null>(defaultSchool ? (defaultClassSection ?? null) : null)
  return { school, setSchool, classSection, setClassSection }
}

function ScopeFields({ scope, errors, idPrefix }: { scope: ReturnType<typeof useScope>; errors: Record<string, string>; idPrefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="School" htmlFor={`${idPrefix}-school`} required error={errors.school}>
        <SchoolPicker
          id={`${idPrefix}-school`}
          value={scope.school}
          onChange={(v) => {
            scope.setSchool(v)
            scope.setClassSection(null)
          }}
          invalid={!!errors.school}
        />
      </Field>
      <Field label="Class section" htmlFor={`${idPrefix}-cs`} error={errors.class_section} hint="Optional, limits matching to one class">
        <ClassSectionSelect id={`${idPrefix}-cs`} school={scope.school} value={scope.classSection} onChange={scope.setClassSection} allowAll />
      </Field>
    </div>
  )
}

type RegisterJob = AIJob<FaceRegisterResult>

/** Registration mutation that keeps the per-file results whether the request succeeded or not. Registration runs as a background job on the server and `progress` holds its latest state; "nothing to register" is answered straight away without a job. */
function useRegisterMutation(start: () => Promise<{ message: string; data: RegisterJob | FaceRegisterResult }>) {
  const [result, setResult] = useState<FaceRegisterResult | null>(null)
  const [progress, setProgress] = useState<RegisterJob | null>(null)
  const errors = useFormErrors()
  const mutation = useApiMutation(
    async () => {
      setProgress(null)
      const { message, data } = await start()
      if (!isJob<FaceRegisterResult>(data)) return { message, data }
      const done = await waitForJob(data, setProgress)
      return { message: done.message, data: done.result as FaceRegisterResult }
    },
    {
      invalidate: INVALIDATE,
      toastError: false,
      onSuccess: setResult,
      onError: (err) => {
        const failed = faceResultFromError(err)
        if (failed) {
          setResult(failed)
          errors.reset()
        } else errors.capture(err)
      },
    }
  )
  return { mutation, result, setResult, progress, errors }
}

/** Live progress of a registration job: what it is doing and how many are done. */
function RegisterProgress({ job, fallback }: { job: RegisterJob | null; fallback: string }) {
  const counted = !!job && job.total > 0
  return (
    <div className="grid gap-2 rounded-xl border bg-muted/30 p-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
          <span className="truncate">{job?.message || fallback}</span>
        </span>
        {counted && (
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {job.processed} of {job.total}
          </span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${Math.max(job?.percent ?? 0, 4)}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {counted && job.processed > 0 ? `${job.succeeded} registered, ${job.failed} failed so far. ` : ""}
        Large batches can take several minutes; keep this window open to see the results.
      </p>
    </div>
  )
}

function ResultView({ result, failedAll }: { result: FaceRegisterResult; failedAll: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3">
      {failedAll ? (
        <FormAlert message="No faces were registered. Check the reasons below, fix the photos and try again." />
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5 text-sm text-primary">
          <UserRoundCheck className="size-4 shrink-0" />
          {result.total === 0
            ? "Nothing to register. Every selected student already has a face or has no profile photo."
            : `${result.registered} of ${result.total} face${result.total === 1 ? "" : "s"} registered.`}
        </p>
      )}
      <FaceResultTable result={result} />
    </motion.div>
  )
}

function Shell({
  open,
  onOpenChange,
  pending,
  title,
  icon,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  title: string
  icon: ReactNode
  description: ReactNode
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BulkRegisterDialog({ open, onOpenChange, defaultSchool, defaultClassSection }: ScopeDialogProps) {
  const scope = useScope(defaultSchool, defaultClassSection)
  const [files, setFiles] = useState<File[]>([])
  const { mutation, result, setResult, progress, errors } = useRegisterMutation(() =>
    facesApi.register({ images: files, school: scope.school, class_section: scope.classSection })
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    mutation.mutate()
  }

  const imageError = Object.entries(errors.fields).find(([k]) => k.startsWith("images"))?.[1]

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      pending={mutation.isPending}
      title="Bulk register faces"
      icon={<Images className="size-4 text-primary" />}
      description="Upload one clear, front-facing photo per student. Each photo also becomes the student's profile picture."
      footer={
        result ? (
          <>
            <Button variant="outline" onClick={() => setResult(null)}>
              Upload more
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="bulk-face-form" disabled={mutation.isPending || !scope.school || files.length === 0}>
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <ScanFace />}
              {mutation.isPending ? "Registering" : `Register ${files.length || ""} face${files.length === 1 ? "" : "s"}`}
            </Button>
          </>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <ResultView key="result" result={result} failedAll={result.registered === 0 && result.total > 0} />
        ) : (
          <motion.form key="form" id="bulk-face-form" onSubmit={submit} exit={{ opacity: 0 }} className="grid gap-4">
            <FormAlert message={errors.form} />
            <div className="flex gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
              <FileImage className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="grid gap-1">
                <p className="font-medium">Name each file after the student ID</p>
                <p className="text-muted-foreground">
                  The file name without its extension must match the student ID exactly, for example{" "}
                  <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">STU001.jpg</code> for student{" "}
                  <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">STU001</code>. Files that do not match a student in the chosen
                  school or class are reported as failed.
                </p>
              </div>
            </div>
            <ScopeFields scope={scope} errors={errors.fields} idPrefix="bulk" />
            <Field label="Student photos" required error={imageError} hint={`${files.length} of ${MAX_FACE_IMAGES} photos selected`}>
              <FileDropzone
                camera={false}
                files={files}
                onChange={setFiles}
                accept="image/*"
                multiple
                maxFiles={MAX_FACE_IMAGES}
                invalid={!!imageError}
                label="Drop student photos here or click to browse"
                hint="Up to 100 images, named like STU001.jpg"
              />
            </Field>
            {mutation.isPending && <RegisterProgress job={progress} fallback={`Uploading ${files.length} photo${files.length === 1 ? "" : "s"}`} />}
          </motion.form>
        )}
      </AnimatePresence>
    </Shell>
  )
}

export function ProfileRegisterDialog({ open, onOpenChange, defaultSchool, defaultClassSection }: ScopeDialogProps) {
  const scope = useScope(defaultSchool, defaultClassSection)
  const [onlyUnregistered, setOnlyUnregistered] = useState(true)
  const { mutation, result, progress, errors } = useRegisterMutation(() =>
    facesApi.registerFromProfile({
      school: scope.school,
      ...(scope.classSection ? { class_section: scope.classSection } : {}),
      only_unregistered: onlyUnregistered,
    })
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    mutation.mutate()
  }

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      pending={mutation.isPending}
      title="Register from profile photos"
      icon={<UserRoundCheck className="size-4 text-primary" />}
      description="Uses the profile photos already uploaded for students, so nothing has to be uploaded twice. Students without a profile photo are skipped."
      footer={
        result ? (
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="profile-face-form" disabled={mutation.isPending || !scope.school}>
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <ScanFace />}
              {mutation.isPending ? "Registering" : "Register faces"}
            </Button>
          </>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <ResultView key="result" result={result} failedAll={result.registered === 0 && result.total > 0} />
        ) : (
          <motion.form key="form" id="profile-face-form" onSubmit={submit} exit={{ opacity: 0 }} className="grid gap-4">
            <FormAlert message={errors.form} />
            <ScopeFields scope={scope} errors={errors.fields} idPrefix="profile" />
            <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
              <div className="grid gap-0.5">
                <Label htmlFor="only-unregistered">Only students without a face</Label>
                <p className="text-xs text-muted-foreground">Turn off to re-register everyone from their current profile photo.</p>
              </div>
              <Switch id="only-unregistered" checked={onlyUnregistered} onCheckedChange={setOnlyUnregistered} />
            </div>
            {mutation.isPending && <RegisterProgress job={progress} fallback="Starting registration from profile photos" />}
          </motion.form>
        )}
      </AnimatePresence>
    </Shell>
  )
}

/** Registers one student's face. A finished job does not mean the face was accepted; the job result says whether it was. */
export function SingleRegisterDialog({
  student,
  school,
  onOpenChange,
}: {
  student: FaceStatus | null
  school: number | null
  onOpenChange: (open: boolean) => void
}) {
  const open = !!student
  const [files, setFiles] = useState<File[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [progress, setProgress] = useState<RegisterJob | null>(null)
  const errors = useFormErrors()

  const mutation = useApiMutation(() => runJob(facesApi.register({ images: files, student: student?.id, school }), setProgress), {
    invalidate: INVALIDATE,
    toastError: false,
    toastSuccess: false,
    onSuccess: (result) => {
      if (result.registered === 0) {
        setFailure(result.results[0]?.error ?? "No face could be registered from this photo.")
        return
      }
      toast.success("Face registered.")
      onOpenChange(false)
    },
    onError: (err) => {
      const failed = faceResultFromError(err)
      if (failed) setFailure(failed.results[0]?.error ?? "No face could be registered from this photo.")
      else errors.capture(err)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    setFailure(null)
    setProgress(null)
    mutation.mutate()
  }

  const imageError = Object.entries(errors.fields).find(([k]) => k.startsWith("images"))?.[1]

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      pending={mutation.isPending}
      title={student?.face_registered ? "Replace face" : "Register face"}
      icon={<ScanFace className="size-4 text-primary" />}
      description="Upload one clear, front-facing photo with only this student in it. It also becomes their profile picture."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="single-face-form" disabled={mutation.isPending || files.length === 0}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <ScanFace />}
            {mutation.isPending ? "Registering" : "Register face"}
          </Button>
        </>
      }
    >
      <form id="single-face-form" onSubmit={submit} className="grid gap-4">
        {student && (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
            <PersonAvatar name={student.name} src={student.profile_image} />
            <div className="min-w-0">
              <p className="truncate font-medium">{student.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {student.student_id}
                {student.roll_number && ` · Roll ${student.roll_number}`}
              </p>
            </div>
          </div>
        )}
        <FormAlert message={failure ?? errors.form ?? errors.fields.student ?? errors.fields.school} />
        <Field label="Photo" required error={imageError}>
          <FileDropzone files={files} onChange={setFiles} accept="image/*" preview invalid={!!imageError} label="Drop a photo here or click to browse" />
        </Field>
        {mutation.isPending && <RegisterProgress job={progress} fallback="Uploading photo" />}
      </form>
    </Shell>
  )
}
