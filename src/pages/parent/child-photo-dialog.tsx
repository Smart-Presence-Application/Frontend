import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ImageUp, LoaderCircle } from "lucide-react"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { FormAlert } from "@/components/admin/states"
import { PersonAvatar } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { errorMessage } from "@/lib/api"
import { parentPortalApi } from "@/lib/endpoints"
import { followJobInToast } from "@/lib/jobs"
import type { Student } from "@/lib/types"

/** A parent sends or changes their child's photo; a change to a registered face is registered straight away. */
export function ChildPhotoDialog({ student, open, onOpenChange }: { student?: Student; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{student?.has_profile_image ? "Change photo" : "Upload photo"}</DialogTitle>
          <DialogDescription>
            Use a clear, well-lit, front-facing photo with only your child in it.{" "}
            {student?.face_registered
              ? "It is checked and replaces the face used for attendance within a few minutes; a photo without one clear face is refused and the current one kept."
              : "The school will register their face for attendance from this photo."}
          </DialogDescription>
        </DialogHeader>
        {open && student && <PhotoForm student={student} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PhotoForm({ student, onDone }: { student: Student; onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const queryClient = useQueryClient()
  const mutation = useApiMutation((file: File) => parentPortalApi.uploadChildPhoto(student.id, file), {
    invalidate: [["parent", "me"]],
    toastError: false,
    onSuccess: (data) => {
      onDone()
      followJobInToast(data.face_job, `Checking ${student.name}'s new photo`, () =>
        queryClient.invalidateQueries({ queryKey: ["parent", "me"] })
      )
    },
  })

  return (
    <>
      <div className="grid gap-4">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <PersonAvatar name={student.name} src={student.profile_image} className="size-12" />
          <div className="min-w-0">
            <p className="truncate font-medium">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.profile_image ? "Current photo" : "No photo yet"}</p>
          </div>
        </div>
        <FileDropzone
          files={files}
          onChange={(next) => {
            setFiles(next)
            mutation.reset()
          }}
          accept="image/*"
          preview
          label="Drop a photo here or tap to choose"
          hint="JPG or PNG"
        />
        <FormAlert message={mutation.error ? errorMessage(mutation.error) : null} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button disabled={!files[0] || mutation.isPending} onClick={() => files[0] && mutation.mutate(files[0])}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
          Upload photo
        </Button>
      </DialogFooter>
    </>
  )
}
