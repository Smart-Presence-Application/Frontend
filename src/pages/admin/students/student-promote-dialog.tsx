import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, GraduationCap, LoaderCircle } from "lucide-react"

import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { FormAlert } from "@/components/admin/states"
import { Field } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { errorMessage } from "@/lib/api"
import { studentsApi } from "@/lib/endpoints"
import type { Student } from "@/lib/types"

type RollMode = "keep" | "renumber" | "alphabetical"

const ROLL_MODES: { value: RollMode; label: string; hint: string }[] = [
  { value: "renumber", label: "Renumber in roll order", hint: "1, 2, 3... following their current roll numbers" },
  { value: "alphabetical", label: "Renumber by name", hint: "1, 2, 3... in alphabetical order" },
  { value: "keep", label: "Keep current roll numbers", hint: "Only works if none clash in the new class" },
]

/** Every student of one class section (the API pages at 100). */
async function allStudentsOf(classSection: number): Promise<Student[]> {
  const out: Student[] = []
  for (let page = 1; ; page++) {
    const data = await studentsApi.list({ class_section: classSection, page, page_size: 100 })
    out.push(...data.results)
    if (out.length >= data.count || !data.results.length) return out
  }
}

/** Move a class's students, together, into another class section (usually next year's). */
export function StudentPromoteDialog({
  open,
  onOpenChange,
  defaults,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults: { school: number | null; class_section: number | null }
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Promote students</DialogTitle>
          <DialogDescription>
            Move students into another class section, such as next year's class. Their records, photos and faces move with them; past attendance stays
            with the old class.
          </DialogDescription>
        </DialogHeader>
        {open && <PromoteForm defaults={defaults} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

/** Everyone starts included; students left out repeat the year. */
function PromoteForm({ defaults, onDone }: { defaults: { school: number | null; class_section: number | null }; onDone: () => void }) {
  const { scopeSchool } = usePanel()
  const [school, setSchool] = useState<number | null>(scopeSchool?.id ?? defaults.school)
  const [from, setFrom] = useState<number | null>(defaults.class_section)
  const [to, setTo] = useState<number | null>(null)
  const [mode, setMode] = useState<RollMode>("renumber")
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  const students = useQuery({
    queryKey: ["students", "promote-source", from],
    queryFn: () => allStudentsOf(from!),
    enabled: !!from,
  })
  const list = students.data ?? []
  const chosen = list.filter((s) => !excluded.has(s.id))

  const mutation = useApiMutation(
    () => studentsApi.promote({ student_ids: chosen.map((s) => s.id), to_class_section: to, roll_numbers: mode }),
    { invalidate: [["students"], ["dashboard"], ["parents"]], toastError: false, onSuccess: onDone }
  )

  const toggle = (id: number) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      <div className="grid gap-4">
        {!scopeSchool && (
          <Field label="School" required>
            <SchoolPicker
              value={school}
              onChange={(v) => {
                setSchool(v)
                setFrom(null)
                setTo(null)
              }}
            />
          </Field>
        )}

        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Field label="From class section" required>
            <ClassSectionSelect
              school={school}
              value={from}
              onChange={(v) => {
                setFrom(v)
                setExcluded(new Set())
              }}
            />
          </Field>
          <ArrowRight className="mb-2.5 hidden size-4 text-muted-foreground sm:block" />
          <Field label="To class section" required>
            <ClassSectionSelect school={school} value={to} onChange={setTo} placeholder="Select destination" />
          </Field>
        </div>

        {from && (
          <div className="rounded-xl border">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <span className="text-sm font-medium">
                {chosen.length} of {list.length} student{list.length === 1 ? "" : "s"} selected
              </span>
              {list.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExcluded(chosen.length === list.length ? new Set(list.map((s) => s.id)) : new Set())}
                >
                  {chosen.length === list.length ? "Clear all" : "Select all"}
                </Button>
              )}
            </div>
            <ul className="max-h-60 overflow-y-auto">
              {students.isLoading
                ? Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className="px-3 py-2">
                      <Skeleton className="h-6" />
                    </li>
                  ))
                : list.map((s) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                        <Checkbox checked={!excluded.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                        <span className="w-10 font-mono text-xs text-muted-foreground tabular-nums">{s.roll_number}</span>
                        <span className="min-w-0 flex-1 truncate">{s.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{s.student_id}</span>
                      </label>
                    </li>
                  ))}
              {!students.isLoading && list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No students in this class section.</li>}
            </ul>
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">Untick anyone repeating the year; they stay where they are.</p>
          </div>
        )}

        <Field label="Roll numbers in the new class">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as RollMode)} className="gap-2">
            {ROLL_MODES.map((m) => (
              <Label key={m.value} htmlFor={`roll-${m.value}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary/50">
                <RadioGroupItem id={`roll-${m.value}`} value={m.value} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.hint}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </Field>

        <FormAlert message={mutation.error ? errorMessage(mutation.error) : null} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button disabled={!from || !to || from === to || !chosen.length || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <GraduationCap />}
          Promote {chosen.length || ""} student{chosen.length === 1 ? "" : "s"}
        </Button>
      </DialogFooter>
    </>
  )
}
