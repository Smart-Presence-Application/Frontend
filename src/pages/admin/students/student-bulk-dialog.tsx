import { useState } from "react"
import { LoaderCircle, Upload } from "lucide-react"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { studentsApi } from "@/lib/endpoints"
import { downloadCsv } from "../teachers/constants"
import { CsvErrors, TemplateButton } from "../teachers/csv-parts"

const HEADER = ["student_id", "name", "roll_number"]
const EXAMPLES = [
  ["STU0001", "Rohan Gupta", "1"],
  ["STU0002", "Meera Iyer", "2"],
]

interface StudentBulkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: { school: number | null; class_section: number | null }
}

export function StudentBulkDialog({ open, onOpenChange, defaults }: StudentBulkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk enroll students</DialogTitle>
          <DialogDescription>
            All rows go into one class section. Every row is validated first; nothing is enrolled if any row has a problem.
          </DialogDescription>
        </DialogHeader>
        {open && <BulkForm defaults={defaults} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function BulkForm({ defaults, onDone }: { defaults?: StudentBulkDialogProps["defaults"]; onDone: () => void }) {
  const [school, setSchool] = useState<number | null>(defaults?.school ?? null)
  const [classSection, setClassSection] = useState<number | null>(defaults?.school ? defaults.class_section : null)
  const [files, setFiles] = useState<File[]>([])

  const mutation = useApiMutation(
    (v: { file: File; school: number; classSection: number }) => studentsApi.bulkUpload(v.file, v.school, v.classSection),
    { invalidate: [["students"], ["dashboard"]], toastError: false, onSuccess: onDone }
  )

  const ready = !!school && !!classSection && files.length === 1

  return (
    <>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="School" htmlFor="sb-school" required>
            <SchoolPicker
              id="sb-school"
              value={school}
              onChange={(v) => {
                setSchool(v)
                setClassSection(null)
              }}
            />
          </Field>
          <Field label="Class section" htmlFor="sb-cs" required>
            <ClassSectionSelect id="sb-cs" school={school} value={classSection} onChange={setClassSection} />
          </Field>
        </div>
        <Field label="CSV file" required hint="Columns: student_id, name, roll_number. Up to 1000 rows.">
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
        <div>
          <TemplateButton onClick={() => downloadCsv("students-template.csv", HEADER, EXAMPLES)} />
        </div>
        <CsvErrors error={mutation.error} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          disabled={!ready || mutation.isPending}
          onClick={() => school && classSection && files[0] && mutation.mutate({ file: files[0], school, classSection })}
        >
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Upload />}
          Enroll students
        </Button>
      </DialogFooter>
    </>
  )
}
