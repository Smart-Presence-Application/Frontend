import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { Bell, GraduationCap, LoaderCircle, Paperclip, Presentation, Send, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { FileDropzone } from "@/components/admin/file-dropzone"
import { PageHeader } from "@/components/admin/page-header"
import { SchoolMultiPicker, StudentMultiPicker, UserMultiPicker, useSchoolClassSections } from "@/components/admin/pickers"
import { FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { toFormData } from "@/lib/api"
import { notificationsApi } from "@/lib/endpoints"
import { classSectionLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { panelPath } from "@/lib/panel"

const MAX_FILES = 10
const MAX_SIZE = 50 * 1024 * 1024

interface GroupToggle {
  key: "to_school_admins" | "to_teachers" | "to_parents"
  label: string
  text: string
  icon: LucideIcon
}

const GROUPS: GroupToggle[] = [
  { key: "to_school_admins", label: "School admins", text: "The admin of each chosen school", icon: ShieldCheck },
  { key: "to_teachers", label: "Teachers", text: "Every teacher in the chosen schools", icon: Presentation },
  { key: "to_parents", label: "Parents", text: "Parents of students in the chosen schools", icon: UsersRound },
]

const SENDER_LABEL = { super: "Super Admin", school: "School Admin", teacher: "Class teacher", parent: "Parent" } as const

function groupText(g: GroupToggle, isTeacher: boolean, ownSchool: boolean) {
  if (isTeacher) return "Parents of every student in your class"
  return ownSchool ? g.text.replace("the chosen schools", "your school") : g.text
}

/** Composes a notification. School Admins reach teachers and parents of their own school; teachers reach only the parents of their own class section and cannot list the others. Class sections can be narrowed only when exactly one school is chosen. Sent as multipart only when there are files, since JSON keeps lists and booleans typed. */
export default function ComposeNotificationPage() {
  const navigate = useNavigate()
  const errors = useFormErrors()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [groups, setGroups] = useState({ to_school_admins: false, to_teachers: false, to_parents: false })
  const panel = usePanel()
  const isTeacher = panel.kind === "teacher"
  const ownSchool = panel.scopeSchool?.id ?? null
  const groupsAllowed = isTeacher ? GROUPS.filter((g) => g.key === "to_parents") : ownSchool ? GROUPS.filter((g) => g.key !== "to_school_admins") : GROUPS
  const [schools, setSchools] = useState<number[]>([])
  const [classSections, setClassSections] = useState<number[]>([])
  const [users, setUsers] = useState<number[]>([])
  const [students, setStudents] = useState<number[]>([])
  const [files, setFiles] = useState<File[]>([])

  const singleSchool = ownSchool ?? (schools.length === 1 ? schools[0] : null)
  const sections = useSchoolClassSections(isTeacher ? null : singleSchool)

  const tooLarge = files.filter((f) => f.size > MAX_SIZE)
  const anyGroup = groups.to_school_admins || groups.to_teachers || groups.to_parents
  const hasAudience = anyGroup || users.length > 0 || students.length > 0

  const send = useApiMutation(
    () => {
      const fields = {
        title: title.trim(),
        message: message.trim(),
        ...groups,
        schools: anyGroup && !ownSchool ? schools : [],
        class_sections: anyGroup && singleSchool && !isTeacher ? classSections : [],
        users,
        students,
      }
      return notificationsApi.create(files.length ? toFormData({ ...fields, attachments: files }) : fields)
    },
    {
      invalidate: [["notifications"], ["inbox"], ["dashboard"]],
      toastError: false,
      onError: errors.capture,
      onSuccess: (n) => navigate(panelPath(`/admin/notifications/${n.id}`)),
    }
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    errors.reset()
    send.mutate()
  }

  function setSchoolList(next: number[]) {
    setSchools(next)
    if (next.length !== 1) setClassSections([])
  }

  return (
    <>
      <PageHeader
        title="Compose notification"
        description="Send an announcement with optional attachments. Recipients see it in their inbox."
        backTo={panelPath("/admin/notifications")}
      />

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Message</CardTitle>
              <CardDescription>Write a message, attach files, or both.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormAlert message={errors.form} />
              <Field label="Title" htmlFor="n-title" required error={errors.fields.title}>
                <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} required placeholder="School closed on Friday" />
              </Field>
              <Field label="Message" htmlFor="n-message" error={errors.fields.message}>
                <Textarea
                  id="n-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Write the details here"
                  className="resize-y"
                />
              </Field>
              <Field
                label="Attachments"
                error={errors.fields.attachments ?? (tooLarge.length ? `${tooLarge[0].name} is larger than 50 MB.` : undefined)}
                hint={`Up to ${MAX_FILES} files, 50 MB each. Executables and scripts are blocked.`}
              >
                <FileDropzone files={files} onChange={setFiles} multiple maxFiles={MAX_FILES} label="Drop files to attach or click to browse" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Audience</CardTitle>
              <CardDescription>Combine groups, individual users and students. Everyone matching any choice receives it once.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className={cn("grid gap-3", isTeacher ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
                {groupsAllowed.map((g) => {
                  const on = groups[g.key]
                  return (
                    <label
                      key={g.key}
                      className={cn(
                        "flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-all",
                        on ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "hover:border-primary/40"
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg transition-colors",
                            on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <g.icon className="size-4" />
                        </span>
                        <Switch checked={on} onCheckedChange={(v) => setGroups((prev) => ({ ...prev, [g.key]: v }))} aria-label={g.label} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{g.label}</span>
                        <span className="block text-xs text-muted-foreground">{groupText(g, isTeacher, !!ownSchool)}</span>
                      </span>
                    </label>
                  )
                })}
              </div>

              <motion.div
                initial={false}
                animate={{ height: anyGroup && !isTeacher ? "auto" : 0, opacity: anyGroup && !isTeacher ? 1 : 0 }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 rounded-xl bg-muted/40 p-4">
                  {!ownSchool && (
                    <Field label="Limit to schools" error={errors.fields.schools} hint="Leave empty to reach every school.">
                      <SchoolMultiPicker value={schools} onChange={setSchoolList} />
                    </Field>
                  )}
                  {singleSchool && (
                    <Field label="Limit to class sections" error={errors.fields.class_sections} hint="Optional. Applies to teachers and parents of these sections.">
                      {sections.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading class sections</p>
                      ) : sections.all.length ? (
                        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                          {sections.all.map((cs) => (
                            <label key={cs.id} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                              <Checkbox
                                checked={classSections.includes(cs.id)}
                                onCheckedChange={(v) => setClassSections((prev) => (v ? [...prev, cs.id] : prev.filter((x) => x !== cs.id)))}
                              />
                              <span className="truncate">{classSectionLabel(cs)}</span>
                              <span className="ml-auto truncate text-[10px] text-muted-foreground">{cs.academic_year_name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">This school has no class sections yet.</p>
                      )}
                    </Field>
                  )}
                </div>
              </motion.div>

              <div className={cn("grid gap-4", !isTeacher && "md:grid-cols-2")}>
                {!isTeacher && (
                  <Field label="Individual users" error={errors.fields.users}>
                    <UserMultiPicker value={users} onChange={setUsers} />
                  </Field>
                )}
                <Field label="Parents of specific students" error={errors.fields.students}>
                  <StudentMultiPicker value={students} onChange={setStudents} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Preview</CardTitle>
              <CardDescription>How it appears in an inbox</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <motion.div layout className="rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bell className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{title || "Your title"}</p>
                    <p className="text-xs text-muted-foreground">From {SENDER_LABEL[panel.kind]} · just now</p>
                    <p className="mt-2 line-clamp-6 text-sm whitespace-pre-line text-muted-foreground">{message || "Your message appears here."}</p>
                    {files.length > 0 && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                        <Paperclip className="size-3" /> {files.length} attachment(s)
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>

              <ul className="grid gap-1.5 text-sm">
                {GROUPS.filter((g) => groups[g.key]).map((g) => (
                  <li key={g.key} className="flex items-center gap-2">
                    <g.icon className="size-4 text-primary" /> {g.label}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {isTeacher
                        ? "Your class"
                        : ownSchool
                          ? classSections.length
                            ? `${classSections.length} section(s)`
                            : "Whole school"
                          : schools.length
                            ? `${schools.length} school(s)`
                            : "All schools"}
                    </span>
                  </li>
                ))}
                {users.length > 0 && (
                  <li className="flex items-center gap-2">
                    <UsersRound className="size-4 text-primary" /> {users.length} individual user(s)
                  </li>
                )}
                {students.length > 0 && (
                  <li className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-primary" /> Parents of {students.length} student(s)
                  </li>
                )}
                {!hasAudience && <li className="text-muted-foreground">Choose at least one audience.</li>}
              </ul>

              <Button
                type="submit"
                size="lg"
                className="h-11 w-full shadow-lg shadow-primary/25"
                disabled={send.isPending || !title.trim() || !hasAudience || (!message.trim() && !files.length) || tooLarge.length > 0}
              >
                {send.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
                {send.isPending ? "Sending" : "Send notification"}
              </Button>
              {!message.trim() && !files.length && <p className="text-center text-xs text-muted-foreground">Write a message or attach at least one file.</p>}
            </CardContent>
          </Card>
        </aside>
      </form>
    </>
  )
}
