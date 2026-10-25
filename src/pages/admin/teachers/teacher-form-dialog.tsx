import { useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, IdCard, LoaderCircle, MapPin } from "lucide-react"

import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { ErrorState, FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { teachersApi } from "@/lib/endpoints"
import type { Teacher } from "@/lib/types"
import { GENDERS } from "./constants"

const TEXT_FIELDS = ["employee_id", "name", "email", "phone_number", "address", "city", "state", "country", "pincode"] as const

interface TeacherFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher
  onSaved?: (teacher: Teacher) => void
}

/** Edits `teacher` when given, fetching the full record since list rows lack the address block; otherwise creates one. */
export function TeacherFormDialog({ open, onOpenChange, teacher, onSaved }: TeacherFormDialogProps) {
  const editing = !!teacher
  const detail = useQuery({
    queryKey: ["teacher", teacher?.id],
    queryFn: () => teachersApi.get(teacher!.id),
    enabled: open && editing,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit teacher" : "Add a teacher"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the teacher's profile. Use the class assignment actions to change their class section."
              : "The teacher starts inactive. Activate them to email their login details."}
          </DialogDescription>
        </DialogHeader>
        {!editing ? (
          <TeacherForm key={String(open)} onDone={onOpenChange} onSaved={onSaved} />
        ) : detail.data ? (
          <TeacherForm key={`${detail.data.id}-${detail.data.updated_at}-${open}`} teacher={detail.data} onDone={onOpenChange} onSaved={onSaved} />
        ) : detail.error ? (
          <ErrorState error={detail.error} onRetry={detail.refetch} className="py-8" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="grid gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TeacherForm({ teacher, onDone, onSaved }: { teacher?: Teacher; onDone: (open: boolean) => void; onSaved?: (t: Teacher) => void }) {
  const editing = !!teacher
  const errors = useFormErrors()
  const [school, setSchool] = useState<number | null>(null)
  const [classSection, setClassSection] = useState<number | null>(null)
  const [gender, setGender] = useState<string>(teacher?.gender ?? "")

  const [schoolMissing, setSchoolMissing] = useState(false)

  const mutation = useApiMutation(
    (form: FormData) => {
      const value = (key: string) => String(form.get(key) ?? "").trim()
      const body: Record<string, unknown> = Object.fromEntries(TEXT_FIELDS.map((k) => [k, value(k)]))
      const joining = value("joining_date")
      if (gender) body.gender = gender
      if (editing) {
        body.joining_date = joining || null
        return teachersApi.update(teacher.id, body)
      }
      if (joining) body.joining_date = joining
      body.school = school
      if (classSection) body.class_section = classSection
      return teachersApi.create(body)
    },
    {
      invalidate: editing ? [["teachers"], ["teacher"]] : [["teachers"], ["dashboard"]],
      toastError: false,
      onError: errors.capture,
      onQueued: () => onDone(false),
      onSuccess: (data) => {
        onSaved?.(data)
        onDone(false)
      },
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    errors.reset()
    if (!editing && !school) {
      setSchoolMissing(true)
      return
    }
    mutation.mutate(new FormData(event.currentTarget))
  }

  const err = errors.fields
  const missingSchool = schoolMissing && !school

  return (
    <>
      <form id="teacher-form" onSubmit={submit} className="grid gap-5">
        <FormAlert message={missingSchool ? "Pick the school this teacher belongs to." : errors.form} />

        <section className="grid gap-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <IdCard className="size-4 text-primary" /> Profile
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {!editing && (
              <Field label="School" htmlFor="teacher-school" required error={err.school} className="sm:col-span-2">
                <SchoolPicker
                  id="teacher-school"
                  value={school}
                  onChange={(v) => {
                    setSchool(v)
                    setClassSection(null)
                  }}
                  invalid={!!err.school || missingSchool}
                />
              </Field>
            )}
            <Field label="Full name" htmlFor="t-name" required error={err.name}>
              <Input id="t-name" name="name" required defaultValue={teacher?.name} placeholder="Anita Verma" />
            </Field>
            <Field label="Employee ID" htmlFor="t-employee_id" required error={err.employee_id}>
              <Input id="t-employee_id" name="employee_id" required defaultValue={teacher?.employee_id} placeholder="EMP001" />
            </Field>
            <Field label="Email" htmlFor="t-email" required error={err.email} hint={editing ? undefined : "Login details are sent here on activation"}>
              <Input id="t-email" name="email" type="email" required defaultValue={teacher?.email} placeholder="teacher@school.edu" />
            </Field>
            <Field label="Mobile number" htmlFor="t-phone" error={err.phone_number}>
              <Input
                id="t-phone"
                name="phone_number"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                defaultValue={teacher?.phone_number ?? ""}
                placeholder="9876543210"
              />
            </Field>
            <Field label="Gender" htmlFor="t-gender" error={err.gender}>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="t-gender" className="h-9 w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Joining date" htmlFor="t-joining" error={err.joining_date}>
              <Input id="t-joining" name="joining_date" type="date" defaultValue={teacher?.joining_date ?? ""} />
            </Field>
          </div>
        </section>

        {!editing && (
          <>
            <Separator />
            <section className="grid gap-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="size-4 text-primary" /> Class assignment
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </h3>
              <Field label="Class section" htmlFor="t-class-section" error={err.class_section} hint="You can also assign one later.">
                <ClassSectionSelect id="t-class-section" school={school} value={classSection} onChange={setClassSection} invalid={!!err.class_section} />
              </Field>
            </section>
          </>
        )}

        <Separator />
        <section className="grid gap-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" /> Address
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" htmlFor="t-address" error={err.address} className="sm:col-span-2">
              <Textarea id="t-address" name="address" rows={2} defaultValue={teacher?.address} placeholder="Street, area" />
            </Field>
            <Field label="City" htmlFor="t-city" error={err.city}>
              <Input id="t-city" name="city" defaultValue={teacher?.city} />
            </Field>
            <Field label="State" htmlFor="t-state" error={err.state}>
              <Input id="t-state" name="state" defaultValue={teacher?.state} />
            </Field>
            <Field label="Country" htmlFor="t-country" error={err.country}>
              <Input id="t-country" name="country" defaultValue={teacher?.country ?? "India"} />
            </Field>
            <Field label="Pincode" htmlFor="t-pincode" error={err.pincode}>
              <Input id="t-pincode" name="pincode" inputMode="numeric" defaultValue={teacher?.pincode} />
            </Field>
          </div>
        </section>
      </form>

      <DialogFooter>
        <Button variant="outline" onClick={() => onDone(false)} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="teacher-form" disabled={mutation.isPending}>
          {mutation.isPending && <LoaderCircle className="animate-spin" />}
          {editing ? "Save changes" : "Create teacher"}
        </Button>
      </DialogFooter>
    </>
  )
}
