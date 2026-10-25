import { useState, type FormEvent } from "react"
import { Check, Copy, Eye, EyeOff, KeyRound, Link2, LoaderCircle, Phone, UserRound } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { SchoolPicker } from "@/components/admin/pickers"
import { FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { parentsApi } from "@/lib/endpoints"
import type { Parent } from "@/lib/types"
import { cn } from "@/lib/utils"

function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success("Copied to clipboard.")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.")
    }
  }
  return (
    <Button type="button" variant="ghost" size="icon-xs" onClick={copy} aria-label={label} title={label} className={className}>
      {copied ? <Check className="text-primary" /> : <Copy />}
    </Button>
  )
}

/** Initial password, hidden until revealed, with a copy button. */
export function MaskedPassword({ value }: { value: string }) {
  const [shown, setShown] = useState(false)
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 py-0.5 pr-0.5 pl-2">
      <span className={cn("font-mono text-xs tabular-nums", !shown && "tracking-widest")}>{shown ? value : "••••••••"}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        title={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff /> : <Eye />}
      </Button>
      <CopyButton value={value} label="Copy password" />
    </span>
  )
}

/** Success panel listing the login details a staff member hands to the parent. */
function CredentialsPanel({ parent, note }: { parent: Parent; note?: string }) {
  const summary = `Phone: ${parent.phone_number}\nPassword: ${parent.initial_password ?? ""}`
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-xl bg-primary/5 p-4 ring-1 ring-primary/20"
    >
      <div aria-hidden="true" className="absolute -top-10 -right-10 size-28 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative grid gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <KeyRound className="size-4" /> Login details for {parent.name}
        </div>
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2">
            <dt className="text-muted-foreground">Mobile number</dt>
            <dd className="flex items-center gap-1 font-mono">
              {parent.phone_number}
              <CopyButton value={parent.phone_number} label="Copy mobile number" />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2">
            <dt className="text-muted-foreground">Password</dt>
            <dd className="flex items-center gap-1 font-mono font-semibold">
              {parent.initial_password ?? "-"}
              {parent.initial_password && <CopyButton value={parent.initial_password} label="Copy password" />}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{note ?? "Share these with the parent. They will be asked to change the password on first login."}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigator.clipboard.writeText(summary).then(
                () => toast.success("Login details copied."),
                () => toast.error("Could not copy.")
              )
            }
          >
            <Copy /> Copy both
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function ParentCreateDialog({ open, onOpenChange, defaultSchool }: { open: boolean; onOpenChange: (open: boolean) => void; defaultSchool?: number | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        {open && <CreateForm defaultSchool={defaultSchool} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CreateForm({ defaultSchool, onDone }: { defaultSchool?: number | null; onDone: () => void }) {
  const errors = useFormErrors()
  const [school, setSchool] = useState<number | null>(defaultSchool ?? null)
  const [schoolMissing, setSchoolMissing] = useState(false)
  const [result, setResult] = useState<{ parent: Parent; message: string } | null>(null)

  const mutation = useApiMutation(
    (body: Record<string, unknown>) => parentsApi.create(body).then((r) => ({ ...r, data: { parent: r.data, message: r.message } })),
    {
      invalidate: [["parents"], ["parent"], ["dashboard"]],
      toastError: false,
      onError: errors.capture,
      onQueued: onDone,
      onSuccess: setResult,
    }
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    errors.reset()
    if (!school) {
      setSchoolMissing(true)
      return
    }
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? "").trim()
    mutation.mutate({ school, student_id: value("student_id").toUpperCase(), name: value("name"), phone_number: value("phone_number") })
  }

  const err = errors.fields

  if (result) {
    const created = result.parent.created !== false
    return (
      <>
        <DialogHeader>
          <DialogTitle>{created ? "Parent created" : "Linked to existing parent"}</DialogTitle>
          <DialogDescription>{result.message}</DialogDescription>
        </DialogHeader>
        {created ? (
          <CredentialsPanel parent={result.parent} />
        ) : (
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-sm">
            <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              <span className="font-medium">{result.parent.name}</span> now has {result.parent.students.length} linked{" "}
              {result.parent.students.length === 1 ? "child" : "children"}. Their existing password is unchanged.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setResult(null)}>
            Add another
          </Button>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a parent</DialogTitle>
        <DialogDescription>
          A parent account is created with a generated password. If the mobile number already belongs to a parent, the student is linked to
          them instead.
        </DialogDescription>
      </DialogHeader>
      <form id="parent-create-form" onSubmit={submit} className="grid gap-4">
        <FormAlert message={schoolMissing && !school ? "Pick the student's school." : errors.form} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="School" htmlFor="p-school" required error={err.school}>
            <SchoolPicker id="p-school" value={school} onChange={setSchool} invalid={!!err.school || (schoolMissing && !school)} />
          </Field>
          <Field label="Student ID" htmlFor="p-student" required error={err.student_id} hint="The school's student code, e.g. STU0001">
            <Input id="p-student" name="student_id" required placeholder="STU0001" className="uppercase" />
          </Field>
          <Field label="Parent name" htmlFor="p-name" required error={err.name}>
            <Input id="p-name" name="name" required placeholder="Sunita Gupta" />
          </Field>
          <Field label="Mobile number" htmlFor="p-phone" required error={err.phone_number} hint="10 digits; used to sign in">
            <Input
              id="p-phone"
              name="phone_number"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              required
              placeholder="9876543210"
            />
          </Field>
        </div>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="parent-create-form" disabled={mutation.isPending}>
          {mutation.isPending && <LoaderCircle className="animate-spin" />}
          Add parent
        </Button>
      </DialogFooter>
    </>
  )
}

export function ParentEditDialog({ parent, open, onOpenChange }: { parent?: Parent; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit parent</DialogTitle>
          <DialogDescription>Changing the mobile number changes the number the parent signs in with.</DialogDescription>
        </DialogHeader>
        {open && parent && <EditForm parent={parent} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({ parent, onDone }: { parent: Parent; onDone: () => void }) {
  const errors = useFormErrors()
  const mutation = useApiMutation((body: Record<string, unknown>) => parentsApi.update(parent.id, body), {
    invalidate: [["parents"], ["parent"]],
    toastError: false,
    onError: errors.capture,
    onSuccess: onDone,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    errors.reset()
    const form = new FormData(event.currentTarget)
    const body: Record<string, unknown> = {}
    const name = String(form.get("name") ?? "").trim()
    const phone = String(form.get("phone_number") ?? "").trim()
    if (name !== parent.name) body.name = name
    if (phone !== parent.phone_number) body.phone_number = phone
    if (!Object.keys(body).length) return onDone()
    mutation.mutate(body)
  }

  return (
    <>
      <form id="parent-edit-form" onSubmit={submit} className="grid gap-4">
        <FormAlert message={errors.form} />
        <Field label="Name" htmlFor="pe-name" required error={errors.fields.name}>
          <div className="relative">
            <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="pe-name" name="name" required defaultValue={parent.name} className="pl-9" />
          </div>
        </Field>
        <Field label="Mobile number" htmlFor="pe-phone" required error={errors.fields.phone_number}>
          <div className="relative">
            <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="pe-phone"
              name="phone_number"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              required
              defaultValue={parent.phone_number}
              className="pl-9"
            />
          </div>
        </Field>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="parent-edit-form" disabled={mutation.isPending}>
          {mutation.isPending && <LoaderCircle className="animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </>
  )
}

export function NewPasswordDialog({ parent, open, onOpenChange }: { parent?: Parent; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Password reset</DialogTitle>
          <DialogDescription>The previous password no longer works.</DialogDescription>
        </DialogHeader>
        {parent && <CredentialsPanel parent={parent} note="Share the new password with the parent. They will be asked to change it on next login." />}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** An admin picks the parent's new password, as for teachers. It stays visible to staff until the parent changes it. */
export function SetPasswordDialog({ parent, open, onOpenChange }: { parent?: Parent; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set password for {parent?.name}</DialogTitle>
          <DialogDescription>
            At least 12 characters with a mix of letters, numbers or symbols. The current password stops working, and the parent is asked to
            change this one on next login.
          </DialogDescription>
        </DialogHeader>
        {open && parent && <SetPasswordForm parent={parent} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SetPasswordForm({ parent, onDone }: { parent: Parent; onDone: () => void }) {
  const errors = useFormErrors()
  const mutation = useApiMutation((body: Record<string, unknown>) => parentsApi.setPassword(parent.id, body), {
    invalidate: [["parents"], ["parent"]],
    toastError: false,
    onError: errors.capture,
    onSuccess: onDone,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    errors.reset()
    const form = new FormData(event.currentTarget)
    mutation.mutate({ new_password: form.get("new_password"), confirm_new_password: form.get("confirm_new_password") })
  }

  return (
    <>
      <form id="parent-password-form" onSubmit={submit} className="grid gap-4">
        <FormAlert message={errors.form} />
        <Field label="New password" htmlFor="pp-new" required error={errors.fields.new_password}>
          <Input id="pp-new" name="new_password" type="password" autoComplete="new-password" required minLength={12} />
        </Field>
        <Field label="Confirm new password" htmlFor="pp-confirm" required error={errors.fields.confirm_new_password}>
          <Input id="pp-confirm" name="confirm_new_password" type="password" autoComplete="new-password" required minLength={12} />
        </Field>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="parent-password-form" disabled={mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
          Set password
        </Button>
      </DialogFooter>
    </>
  )
}
