import { useState } from "react"
import { CheckCircle2, Copy, Download, Link2, LoaderCircle, Upload, UserPlus, Users } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { SchoolPicker } from "@/components/admin/pickers"
import { Field, Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { parentsApi, studentsApi } from "@/lib/endpoints"
import { classSectionLabel } from "@/lib/format"
import type { Parent } from "@/lib/types"
import { downloadCsv } from "../teachers/constants"
import { CsvErrors, TemplateButton } from "../teachers/csv-parts"
import { MaskedPassword } from "./parent-dialogs"

const HEADER = ["student_id", "name", "phone_number"]
/** Sample rows; the repeated phone number shows one parent linked to two children. */
const EXAMPLES = [
  ["STU0001", "Riya Sharma", "9876543210"],
  ["STU0002", "Riya Sharma", "9876543210"],
  ["STU0003", "Arjun Mehta", "9123456780"],
]

type Result = Awaited<ReturnType<typeof parentsApi.bulkUpload>>["data"]

interface ParentBulkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSchool?: number | null
}

export function ParentBulkDialog({ open, onOpenChange, defaultSchool }: ParentBulkDialogProps) {
  const [result, setResult] = useState<Result | null>(null)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setResult(null)
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {result ? (
          <ResultView result={result} onDone={() => onOpenChange(false)} />
        ) : (
          open && <UploadForm defaultSchool={defaultSchool} onDone={setResult} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** CSV upload step. Super Admins must pick the school the student IDs belong to; a teacher's template comes pre-filled with their class, so only names and numbers are left to type. */
function UploadForm({ defaultSchool, onDone, onCancel }: { defaultSchool?: number | null; onDone: (r: Result) => void; onCancel: () => void }) {
  const { kind, teacher } = usePanel()
  const [school, setSchool] = useState<number | null>(defaultSchool ?? null)
  const [files, setFiles] = useState<File[]>([])
  const [preparing, setPreparing] = useState(false)

  const mutation = useApiMutation((v: { file: File; school: number | null }) => parentsApi.bulkUpload(v.file, kind === "super" ? v.school : null), {
    invalidate: [["parents"], ["dashboard"]],
    toastError: false,
    onSuccess: onDone,
  })

  const ready = files.length === 1 && (kind !== "super" || !!school)

  async function downloadClassTemplate() {
    setPreparing(true)
    try {
      const { results } = await studentsApi.list({ page_size: 100, ordering: "roll_number" })
      downloadCsv(
        "parents-my-class.csv",
        HEADER,
        results.map((s) => [s.student_id, "", ""])
      )
    } catch {
      toast.error("Could not load your class list.")
    } finally {
      setPreparing(false)
    }
  }

  const scopeText = {
    super: "Every student ID must belong to the school you pick.",
    school: "Any student in your school can be listed.",
    teacher: teacher?.class_section_detail
      ? `Only students of ${classSectionLabel(teacher.class_section_detail)} can be listed.`
      : "You need an assigned class before adding parents.",
    parent: "",
  }[kind]

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="size-4 text-primary" /> Bulk add parents
        </DialogTitle>
        <DialogDescription>
          One row per child. A mobile number that already has an account links the child to it, and the same number on several rows becomes one parent
          with several children. Nothing is saved if any row has a problem.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        {kind !== "teacher" && (
          <Field label="School" htmlFor="pb-school" required={kind === "super"} hint={scopeText}>
            <SchoolPicker id="pb-school" value={school} onChange={setSchool} />
          </Field>
        )}
        {kind === "teacher" && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{scopeText}</p>}

        <Field label="CSV file" required hint="Columns: student_id, name, phone_number (10 digits). Up to 1000 rows.">
          <FileDropzone
            files={files}
            onChange={(next) => {
              setFiles(next)
              mutation.reset()
            }}
            accept=".csv,text/csv"
            label="Drop a CSV file here or click to browse"
            invalid={!!mutation.error}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <TemplateButton onClick={() => downloadCsv("parents-template.csv", HEADER, EXAMPLES)} />
          {kind === "teacher" && teacher?.class_section && (
            <Button type="button" variant="outline" size="sm" onClick={() => void downloadClassTemplate()} disabled={preparing}>
              {preparing ? <LoaderCircle className="animate-spin" /> : <Download />} Template with my students
            </Button>
          )}
        </div>

        <CsvErrors error={mutation.error} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button disabled={!ready || mutation.isPending} onClick={() => files[0] && mutation.mutate({ file: files[0], school })}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Upload />}
          Add parents
        </Button>
      </DialogFooter>
    </>
  )
}

function childrenOf(parent: Parent) {
  return parent.students.map((s) => `${s.name} (${s.student_id})`).join("; ")
}

/** Upload outcome. Only parents created by this upload still have a password to hand out. */
function ResultView({ result, onDone }: { result: Result; onDone: () => void }) {
  const createdIds = new Set(result.rows.filter((r) => r.created).map((r) => r.parent))
  const fresh = result.parents.filter((p) => createdIds.has(p.id) && p.initial_password)

  function downloadLogins() {
    downloadCsv(
      "parent-logins.csv",
      ["parent_name", "mobile_number", "password", "children"],
      fresh.map((p) => [p.name, p.phone_number, p.initial_password ?? "", childrenOf(p)])
    )
  }

  function copyAll() {
    const text = fresh.map((p) => `${p.name}\nMobile: ${p.phone_number}\nPassword: ${p.initial_password}`).join("\n\n")
    navigator.clipboard.writeText(text).then(
      () => toast.success("Login details copied."),
      () => toast.error("Could not copy.")
    )
  }

  const stats = [
    { label: "New parents", value: result.created, icon: UserPlus },
    { label: "Linked to existing", value: result.linked, icon: Link2 },
    { label: "Already linked", value: result.already_linked, icon: CheckCircle2 },
  ]

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-primary" /> Parents added
        </DialogTitle>
        <DialogDescription>
          {fresh.length
            ? "Share these login details with each new parent. They are asked to change the password the first time they sign in."
            : "No new accounts were needed; the children were linked to parents who already sign in."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border bg-muted/30 p-3 text-center"
            >
              <s.icon className="mx-auto size-4 text-primary" />
              <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {fresh.length > 0 && (
          <div className="overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <p className="text-sm font-medium">Login details ({fresh.length})</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyAll}>
                  <Copy /> Copy all
                </Button>
                <Button size="sm" onClick={downloadLogins}>
                  <Download /> Download CSV
                </Button>
              </div>
            </div>
            <ul className="max-h-72 divide-y overflow-y-auto">
              {fresh.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{childrenOf(p)}</p>
                  </div>
                  <span className="font-mono text-xs">{p.phone_number}</span>
                  {p.initial_password && <MaskedPassword value={p.initial_password} />}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.linked > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Pill tone="gray">Note</Pill> Parents who already had an account keep their current password.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </>
  )
}
