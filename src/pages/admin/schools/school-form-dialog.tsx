import { useEffect, type FormEvent } from "react"
import { Building2, LoaderCircle, UserRound } from "lucide-react"

import { FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { schoolsApi } from "@/lib/endpoints"
import type { SchoolDetail } from "@/lib/types"

interface SchoolFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  school?: SchoolDetail
  onSaved?: (school: SchoolDetail) => void
}

const SCHOOL_FIELDS = ["name", "email", "phone", "address", "city", "state", "country", "pincode"] as const

/** Edits `school` when given; otherwise creates a school together with its school admin. Create errors come nested under "school." / "admin.", edit errors are flat. */
export function SchoolFormDialog({ open, onOpenChange, school, onSaved }: SchoolFormDialogProps) {
  const editing = !!school
  const errors = useFormErrors()
  const { reset } = errors

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const mutation = useApiMutation(
    (form: FormData) => {
      const value = (key: string) => String(form.get(key) ?? "").trim()
      const schoolBody: Record<string, unknown> = Object.fromEntries(SCHOOL_FIELDS.map((k) => [k, value(k)]))
      schoolBody.attendance_threshold = Number(value("attendance_threshold") || 75)
      if (editing) return schoolsApi.update(school.id, schoolBody)
      schoolBody.code = value("code")
      return schoolsApi.create({
        school: schoolBody,
        admin: { name: value("admin_name"), email: value("admin_email"), phone_number: value("admin_phone") },
      })
    },
    {
      invalidate: [["schools"], ["school"]],
      toastError: false,
      onError: errors.capture,
      onQueued: () => onOpenChange(false),
      onSuccess: (data) => {
        onSaved?.(data)
        onOpenChange(false)
      },
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    errors.reset()
    mutation.mutate(new FormData(event.currentTarget))
  }

  const err = (key: string) => errors.fields[editing ? key : `school.${key}`] ?? errors.fields[key]
  const adminErr = (key: string) => errors.fields[`admin.${key}`]

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit school" : "Add a school"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the school's contact details and attendance threshold. The code cannot be changed."
              : "The school and its admin start inactive. Activate the school to email the admin their login details."}
          </DialogDescription>
        </DialogHeader>

        <form id="school-form" onSubmit={submit} className="grid gap-5">
          <FormAlert message={errors.form} />

          <section className="grid gap-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="size-4 text-primary" /> School details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School name" htmlFor="name" required error={err("name")} className="sm:col-span-2">
                <Input id="name" name="name" required defaultValue={school?.name} placeholder="Green Valley Public School" />
              </Field>
              {!editing && (
                <Field label="School code" htmlFor="code" required error={err("code")} hint="Unique short code, e.g. GVPS01">
                  <Input id="code" name="code" required placeholder="GVPS01" className="uppercase" />
                </Field>
              )}
              <Field label="Email" htmlFor="email" required error={err("email")}>
                <Input id="email" name="email" type="email" required defaultValue={school?.email} placeholder="office@school.edu" />
              </Field>
              <Field label="Phone" htmlFor="phone" required error={err("phone")}>
                <Input id="phone" name="phone" type="tel" inputMode="numeric" required defaultValue={school?.phone} placeholder="9876543210" />
              </Field>
              <Field
                label="Attendance threshold (%)"
                htmlFor="attendance_threshold"
                error={err("attendance_threshold")}
                hint="Minimum attendance percentage, 1 to 100"
              >
                <Input
                  id="attendance_threshold"
                  name="attendance_threshold"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={school?.attendance_threshold ?? 75}
                />
              </Field>
              <Field label="Address" htmlFor="address" error={err("address")} className="sm:col-span-2">
                <Textarea id="address" name="address" rows={2} defaultValue={school?.address} placeholder="Street, area" />
              </Field>
              <Field label="City" htmlFor="city" error={err("city")}>
                <Input id="city" name="city" defaultValue={school?.city} />
              </Field>
              <Field label="State" htmlFor="state" error={err("state")}>
                <Input id="state" name="state" defaultValue={school?.state} />
              </Field>
              <Field label="Country" htmlFor="country" error={err("country")}>
                <Input id="country" name="country" defaultValue={school?.country ?? "India"} />
              </Field>
              <Field label="Pincode" htmlFor="pincode" error={err("pincode")}>
                <Input id="pincode" name="pincode" inputMode="numeric" defaultValue={school?.pincode} />
              </Field>
            </div>
          </section>

          {!editing && (
            <>
              <Separator />
              <section className="grid gap-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <UserRound className="size-4 text-primary" /> School admin
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="admin_name" required error={adminErr("name")} className="sm:col-span-2">
                    <Input id="admin_name" name="admin_name" required placeholder="Priya Sharma" />
                  </Field>
                  <Field label="Email" htmlFor="admin_email" required error={adminErr("email")}>
                    <Input id="admin_email" name="admin_email" type="email" required placeholder="admin@school.edu" />
                  </Field>
                  <Field label="Mobile number" htmlFor="admin_phone" required error={adminErr("phone_number")}>
                    <Input
                      id="admin_phone"
                      name="admin_phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      required
                      placeholder="9876543210"
                    />
                  </Field>
                </div>
              </section>
            </>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="school-form" disabled={mutation.isPending}>
            {mutation.isPending && <LoaderCircle className="animate-spin" />}
            {editing ? "Save changes" : "Create school"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
