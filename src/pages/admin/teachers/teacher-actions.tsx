import { useState } from "react"
import { ArrowRightLeft, BookOpen, LoaderCircle, Pencil, Power, PowerOff, Trash2, UserMinus } from "lucide-react"

import { ClassSectionSelect } from "@/components/admin/pickers"
import { FormAlert } from "@/components/admin/states"
import { Field, Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { errorMessage } from "@/lib/api"
import { teachersApi } from "@/lib/endpoints"
import { classSectionLabel } from "@/lib/format"
import type { Teacher } from "@/lib/types"
import type { TeacherAction } from "./use-teacher-actions"

/** Dropdown entries for one teacher; pair with `useTeacherActions().open`. */
export function TeacherMenuItems({ teacher, onAction }: { teacher: Teacher; onAction: (action: TeacherAction, t: Teacher) => void }) {
  const assigned = !!teacher.class_section
  return (
    <>
      <DropdownMenuItem onSelect={() => onAction("edit", teacher)}>
        <Pencil /> Edit profile
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("status", teacher)}>
        {teacher.is_active ? <PowerOff /> : <Power />}
        {teacher.is_active ? "Deactivate" : "Activate"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {assigned ? (
        <>
          <DropdownMenuItem onSelect={() => onAction("transfer", teacher)}>
            <ArrowRightLeft /> Transfer class
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction("revoke", teacher)}>
            <UserMinus /> Revoke class
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem onSelect={() => onAction("assign", teacher)}>
          <BookOpen /> Assign class
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => onAction("delete", teacher)}>
        <Trash2 /> Delete
      </DropdownMenuItem>
    </>
  )
}

export function SectionDialog({ open, mode, teacher, onClose }: { open: boolean; mode: "assign" | "transfer"; teacher?: Teacher; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "transfer" ? "Transfer to another class" : "Assign a class section"}</DialogTitle>
          <DialogDescription>
            {mode === "transfer"
              ? `Move ${teacher?.name} to a different class section in ${teacher?.school_name}.`
              : `Make ${teacher?.name} the class teacher of a section in ${teacher?.school_name}.`}
          </DialogDescription>
        </DialogHeader>
        {open && teacher && <SectionForm key={teacher.id} mode={mode} teacher={teacher} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function SectionForm({ mode, teacher, onClose }: { mode: "assign" | "transfer"; teacher: Teacher; onClose: () => void }) {
  const [value, setValue] = useState<number | null>(null)
  const mutation = useApiMutation(
    (cs: number) => (mode === "transfer" ? teachersApi.transfer(teacher.id, cs) : teachersApi.assignSection(teacher.id, cs)),
    { invalidate: [["teachers"], ["teacher"]], toastError: false, onSuccess: onClose }
  )
  const same = mode === "transfer" && value === teacher.class_section

  return (
    <>
      <div className="grid gap-4">
        {mode === "transfer" && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Currently <Pill tone="green">{classSectionLabel(teacher.class_section_detail, true)}</Pill>
          </p>
        )}
        <Field label={mode === "transfer" ? "New class section" : "Class section"} htmlFor="assign-cs" required>
          <ClassSectionSelect id="assign-cs" school={teacher.school} value={value} onChange={setValue} />
        </Field>
        {same && <p className="text-xs text-amber-700 dark:text-amber-400">The teacher is already assigned to this class section.</p>}
        <FormAlert message={mutation.error ? errorMessage(mutation.error) : null} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button disabled={!value || same || mutation.isPending} onClick={() => value && mutation.mutate(value)}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : mode === "transfer" ? <ArrowRightLeft /> : <BookOpen />}
          {mode === "transfer" ? "Transfer" : "Assign"}
        </Button>
      </DialogFooter>
    </>
  )
}
