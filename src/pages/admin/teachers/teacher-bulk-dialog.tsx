import { useState } from "react"
import { LoaderCircle, Upload } from "lucide-react"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { SchoolPicker } from "@/components/admin/pickers"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { teachersApi } from "@/lib/endpoints"
import { downloadCsv } from "./constants"
import { CsvErrors, TemplateButton } from "./csv-parts"

const HEADER = ["employee_id", "name", "email", "phone_number", "gender", "address", "city", "state", "country", "pincode", "joining_date"]
const EXAMPLE = ["EMP001", "Anita Verma", "anita.verma@school.edu", "9876543210", "FEMALE", "12 MG Road", "Jaipur", "Rajasthan", "India", "302001", "2024-06-01"]

export function TeacherBulkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk upload teachers</DialogTitle>
          <DialogDescription>
            Every row is validated first; nothing is created if any row has a problem. Teachers start inactive, so activate them to email
            their login details.
          </DialogDescription>
        </DialogHeader>
        {open && <BulkForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function BulkForm({ onDone }: { onDone: () => void }) {
  const [school, setSchool] = useState<number | null>(null)
  const [files, setFiles] = useState<File[]>([])

  const mutation = useApiMutation(({ file, school }: { file: File; school: number }) => teachersApi.bulkUpload(file, school), {
    invalidate: [["teachers"], ["dashboard"]],
    toastError: false,
    onSuccess: onDone,
  })

  const ready = !!school && files.length === 1

  return (
    <>
      <div className="grid gap-4">
        <Field label="School" htmlFor="bulk-school" required>
          <SchoolPicker id="bulk-school" value={school} onChange={setSchool} />
        </Field>
        <Field label="CSV file" required hint="Required columns: employee_id, name, email. Up to 1000 rows.">
          <FileDropzone
            files={files}
            onChange={(next) => {
              setFiles(next)
              mutation.reset()
            }}
            accept=".csv,text/csv"
            label="Drop a CSV file here or click to browse"
            hint="Optional columns: phone_number, gender (MALE, FEMALE, OTHER), address, city, state, country, pincode, joining_date (YYYY-MM-DD)"
            invalid={!!mutation.error}
          />
        </Field>
        <div>
          <TemplateButton onClick={() => downloadCsv("teachers-template.csv", HEADER, [EXAMPLE])} />
        </div>
        <CsvErrors error={mutation.error} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button disabled={!ready || mutation.isPending} onClick={() => school && files[0] && mutation.mutate({ file: files[0], school })}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Upload />}
          Upload teachers
        </Button>
      </DialogFooter>
    </>
  )
}
