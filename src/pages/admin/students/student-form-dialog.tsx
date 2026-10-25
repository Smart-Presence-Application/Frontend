import { useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { LoaderCircle } from "lucide-react"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { toFormData } from "@/lib/api"
import { studentsApi } from "@/lib/endpoints"
import { followJobInToast } from "@/lib/jobs"
import type { Student, StudentWithFaceJob } from "@/lib/types"

interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student
  defaults?: { school: number | null; class_section: number | null }
}

/** Edits `student` when given; otherwise creates one, pre-filled from `defaults`. */
export function StudentFormDialog({ open, onOpenChange, student, defaults }: StudentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Enroll a student"}</DialogTitle>
          <DialogDescription>
            {student
              ? "Update the student's details. Pick another class section to move them."
              : "A profile photo is optional now, but it is needed to register the student's face for attendance."}
          </DialogDescription>
        </DialogHeader>
        {open && <StudentForm student={student} defaults={defaults} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

/** Student fields. An enrolment photo is checked and registered as the face in the background. */
function StudentForm({ student, defaults, onDone }: { student?: Student; defaults?: StudentFormDialogProps["defaults"]; onDone: () => void }) {
  const editing = !!student
  const errors = useFormErrors()
  const [school, setSchool] = useState<number | null>(student?.school ?? defaults?.school ?? null)
  const [classSection, setClassSection] = useState<number | null>(student?.class_section ?? (defaults?.school ? defaults.class_section : null))
  const [photo, setPhoto] = useState<File[]>([])
  const [missing, setMissing] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const mutation = useApiMutation(
    (form: FormData) => {
      const value = (key: string) => String(form.get(key) ?? "").trim()
      const body: Record<string, unknown> = { name: value("name"), student_id: value("student_id"), roll_number: value("roll_number") }
      if (editing) {
        if (classSection && classSection !== student.class_section) body.class_section = classSection
        return studentsApi.update(student.id, body)
      }
      body.school = school
      body.class_section = classSection
      return studentsApi.create(photo[0] ? toFormData({ ...body, profile_image: photo[0] }) : body)
    },
    {
      invalidate: editing ? [["students"], ["student"], ["parents"]] : [["students"], ["faces"], ["dashboard"]],
      toastError: false,
      onError: errors.capture,
      onQueued: onDone,
      onSuccess: (data) => {
        onDone()
        if (!editing) {
          const created = data as StudentWithFaceJob
          followJobInToast(created.face_job, `Registering ${created.name}'s face from the photo`, () =>
            [["students"], ["student"], ["faces"], ["dashboard"]].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
          )
        }
      },
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    errors.reset()
    if (!school || !classSection) {
      setMissing(!school ? "Pick the student's school." : "Pick the student's class section.")
      return
    }
    setMissing(null)
    mutation.mutate(new FormData(event.currentTarget))
  }

  const err = errors.fields

  return (
    <>
      <form id="student-form" onSubmit={submit} className="grid gap-4">
        <FormAlert message={missing ?? errors.form} />
        <div className="grid gap-4 sm:grid-cols-2">
          {!editing && (
            <Field label="School" htmlFor="s-school" required error={err.school} className="sm:col-span-2">
              <SchoolPicker
                id="s-school"
                value={school}
                onChange={(v) => {
                  setSchool(v)
                  setClassSection(null)
                }}
                invalid={!!err.school || (!!missing && !school)}
              />
            </Field>
          )}
          <Field
            label="Class section"
            htmlFor="s-class-section"
            required
            error={err.class_section}
            className="sm:col-span-2"
            hint={editing ? `Classes of ${student.school_name}` : undefined}
          >
            <ClassSectionSelect
              id="s-class-section"
              school={school}
              value={classSection}
              onChange={setClassSection}
              invalid={!!err.class_section || (!!missing && !!school && !classSection)}
            />
          </Field>
          <Field label="Full name" htmlFor="s-name" required error={err.name} className="sm:col-span-2">
            <Input id="s-name" name="name" required defaultValue={student?.name} placeholder="Rohan Gupta" />
          </Field>
          <Field label="Student ID" htmlFor="s-student_id" required error={err.student_id} hint="Unique within the school">
            <Input id="s-student_id" name="student_id" required defaultValue={student?.student_id} placeholder="STU0001" className="uppercase" />
          </Field>
          <Field label="Roll number" htmlFor="s-roll" required error={err.roll_number} hint="Unique within the class section">
            <Input id="s-roll" name="roll_number" required defaultValue={student?.roll_number} placeholder="1" />
          </Field>
          {!editing && (
            <Field label="Profile photo" error={err.profile_image} className="sm:col-span-2">
              <FileDropzone
                files={photo}
                onChange={setPhoto}
                accept="image/*"
                preview
                label="Drop a clear, front-facing photo"
                hint="JPG or PNG. Optional. Also registered as the student's face for attendance."
                invalid={!!err.profile_image}
              />
            </Field>
          )}
        </div>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="student-form" disabled={mutation.isPending}>
          {mutation.isPending && <LoaderCircle className="animate-spin" />}
          {editing ? "Save changes" : "Enroll student"}
        </Button>
      </DialogFooter>
    </>
  )
}
