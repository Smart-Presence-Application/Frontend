import { useState } from "react"
import { Power, PowerOff, Trash2, UserMinus } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { teachersApi } from "@/lib/endpoints"
import { classSectionLabel } from "@/lib/format"
import type { Teacher } from "@/lib/types"
import { SectionDialog } from "./teacher-actions"
import { TeacherFormDialog } from "./teacher-form-dialog"

export type TeacherAction = "edit" | "status" | "assign" | "transfer" | "revoke" | "delete"

const LIST_KEYS = [["teachers"], ["teacher"]]

/** Dialog state plus every teacher dialog, shared by the list and the detail page. The teacher is kept after closing so dialog text does not blank out during the exit animation. */
export function useTeacherActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const [action, setAction] = useState<TeacherAction | null>(null)
  const [teacher, setTeacher] = useState<Teacher>()
  const close = () => setAction(null)
  const is = (a: TeacherAction) => action === a

  const statusMutation = useApiMutation((t: Teacher) => teachersApi.setStatus(t.id, !t.is_active), {
    invalidate: [...LIST_KEYS, ["dashboard"]],
    onSuccess: close,
  })
  const revokeMutation = useApiMutation((t: Teacher) => teachersApi.revokeSection(t.id), {
    invalidate: LIST_KEYS,
    onSuccess: close,
  })
  const deleteMutation = useApiMutation((t: Teacher) => teachersApi.remove(t.id), {
    invalidate: [["teachers"], ["dashboard"]],
    onSuccess: () => {
      close()
      onDeleted?.()
    },
  })

  const dialogs = (
    <>
      <TeacherFormDialog open={is("edit")} onOpenChange={(o) => !o && close()} teacher={teacher} />

      <SectionDialog
        open={is("assign") || is("transfer")}
        mode={is("transfer") ? "transfer" : "assign"}
        teacher={teacher}
        onClose={close}
      />

      <ConfirmDialog
        open={is("status")}
        onOpenChange={(o) => !o && close()}
        icon={teacher?.is_active ? PowerOff : Power}
        destructive={teacher?.is_active}
        title={teacher?.is_active ? `Deactivate ${teacher?.name}?` : `Activate ${teacher?.name}?`}
        description={
          teacher?.is_active
            ? "The teacher will no longer be able to sign in. Their records and class assignment are kept."
            : `A new password is generated and emailed to ${teacher?.email ?? "the teacher"} along with their login details.`
        }
        confirmLabel={teacher?.is_active ? "Deactivate" : "Activate and email"}
        loading={statusMutation.isPending}
        onConfirm={() => teacher && statusMutation.mutate(teacher)}
      />

      <ConfirmDialog
        open={is("revoke")}
        onOpenChange={(o) => !o && close()}
        icon={UserMinus}
        destructive
        title={`Revoke class section from ${teacher?.name}?`}
        description={`${teacher?.name} will no longer be the class teacher of ${classSectionLabel(teacher?.class_section_detail)}.`}
        confirmLabel="Revoke"
        loading={revokeMutation.isPending}
        onConfirm={() => teacher && revokeMutation.mutate(teacher)}
      />

      <ConfirmDialog
        open={is("delete")}
        onOpenChange={(o) => !o && close()}
        icon={Trash2}
        destructive
        title={`Delete ${teacher?.name}?`}
        description="This permanently removes the teacher and their login. Teachers referenced by attendance records cannot be deleted; deactivate them instead."
        confirmLabel="Delete teacher"
        loading={deleteMutation.isPending}
        onConfirm={() => teacher && deleteMutation.mutate(teacher)}
      />
    </>
  )

  const open = (next: TeacherAction, t: Teacher) => {
    setTeacher(t)
    setAction(next)
  }

  return { open, dialogs }
}

