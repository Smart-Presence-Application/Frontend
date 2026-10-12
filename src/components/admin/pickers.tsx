import { useEffect } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"
import { Layers, Lock, School } from "lucide-react"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { academicsApi, schoolsApi, studentsApi, usersApi } from "@/lib/endpoints"
import { classSectionLabel, ROLE_LABEL } from "@/lib/format"
import type { ClassSection, Role } from "@/lib/types"
import { usePanel } from "@/context/panel"
import { cn } from "@/lib/utils"
import { AsyncCombobox, type ComboOption } from "./combobox"

const fetchSchools = (search: string) =>
  schoolsApi
    .list({ search, page_size: 50, ordering: "name" })
    .then((d) => d.results.map((s) => ({ value: s.id, label: s.name, sub: `${s.code} · ${s.city || "No city"}` })))

const resolveSchool = (id: number) => schoolsApi.get(id).then((s) => ({ value: s.id, label: s.name, sub: s.code }))

interface SchoolPickerProps {
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  clearable?: boolean
  className?: string
  invalid?: boolean
  id?: string
}

/**
 * A fixed value shown in place of a picker. It reports its id whenever the form's
 * value drifts (e.g. a sibling reset it), so forms built for Super Admins just work.
 */
function LockedValue({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  id: number | null
  label: string
  icon: typeof School
  value: number | null
  onChange: (v: number | null) => void
  className?: string
  ariaLabel: string
}) {
  useEffect(() => {
    if (id !== null && value !== id) onChange(id)
  }, [id, value, onChange])
  return (
    <div className={cn("flex h-9 w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm", className)} aria-label={ariaLabel}>
      <Icon className="size-4 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
      <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-label={`Fixed to your ${ariaLabel.toLowerCase()}`} />
    </div>
  )
}

/** School Admins and teachers can only act on their own school. */
function LockedSchool({ value, onChange, className }: { value: number | null; onChange: (v: number | null) => void; className?: string }) {
  const { scopeSchool } = usePanel()
  return <LockedValue id={scopeSchool?.id ?? null} label={scopeSchool?.name ?? ""} icon={School} value={value} onChange={onChange} className={className} ariaLabel="School" />
}

/**
 * Outside the Super Admin panel the school is fixed: required pickers show it locked,
 * and clearable ones (list filters) are hidden since those lists already cover one school.
 */
export function SchoolPicker({ value, onChange, placeholder = "Select a school", clearable, className, invalid, id }: SchoolPickerProps) {
  const { kind } = usePanel()
  if (kind !== "super") return clearable ? null : <LockedSchool value={value} onChange={onChange} className={className} />
  return (
    <AsyncCombobox
      id={id}
      queryKey="school-picker"
      value={value}
      onChange={(v) => onChange(v)}
      fetchOptions={fetchSchools}
      resolve={resolveSchool}
      placeholder={placeholder}
      searchPlaceholder="Search schools"
      emptyText="No schools found."
      clearable={clearable}
      className={className}
      invalid={invalid}
      aria-label={placeholder}
    />
  )
}

export function SchoolMultiPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <AsyncCombobox
      multiple
      queryKey="school-picker"
      value={value}
      onChange={onChange}
      fetchOptions={fetchSchools}
      resolve={resolveSchool}
      placeholder="All schools"
      searchPlaceholder="Search schools"
      aria-label="Schools"
    />
  )
}

export function UserMultiPicker({ value, onChange, role }: { value: number[]; onChange: (v: number[]) => void; role?: Role }) {
  return (
    <AsyncCombobox
      multiple
      queryKey={`user-picker-${role ?? "all"}`}
      value={value}
      onChange={onChange}
      fetchOptions={(search) =>
        usersApi
          .list({ search, role, page_size: 30, is_active: true })
          .then((d) =>
            d.results
              .filter((u) => u.role !== "SUPER_ADMIN")
              .map((u): ComboOption => ({ value: u.id, label: u.name, sub: `${ROLE_LABEL[u.role]} · ${u.email ?? u.phone_number ?? ""}` }))
          )
      }
      resolve={(id) => usersApi.get(id).then((u) => ({ value: u.id, label: u.name }))}
      placeholder="Pick individual users"
      searchPlaceholder="Search by name, email or phone"
      aria-label="Users"
    />
  )
}

export function StudentMultiPicker({ value, onChange, school }: { value: number[]; onChange: (v: number[]) => void; school?: number | null }) {
  return (
    <AsyncCombobox
      multiple
      queryKey={`student-picker-${school ?? "all"}`}
      value={value}
      onChange={onChange}
      fetchOptions={(search) =>
        studentsApi
          .list({ search, school, page_size: 30 })
          .then((d) =>
            d.results.map((s): ComboOption => ({
              value: s.id,
              label: s.name,
              sub: `${s.student_id} · ${s.school_name} · ${classSectionLabel(s.class_section_detail)}`,
            }))
          )
      }
      resolve={(id) => studentsApi.get(id).then((s) => ({ value: s.id, label: s.name }))}
      placeholder="Pick students (their parents are notified)"
      searchPlaceholder="Search by name, ID or roll number"
      aria-label="Students"
    />
  )
}

export function useAcademicYears(school: number | null | undefined) {
  return useQuery({
    queryKey: ["academic-years", { school, page_size: 100 }],
    queryFn: () => academicsApi.years.list({ school, page_size: 100 }),
    enabled: !!school,
    select: (d) => d.results,
  })
}

/**
 * Class-sections can only be filtered by academic year, so a school's
 * sections are gathered from each of its years (active year first).
 */
export function useSchoolClassSections(school: number | null | undefined) {
  const years = useAcademicYears(school)
  const sorted = [...(years.data ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active))
  const results = useQueries({
    queries: sorted.map((year) => ({
      queryKey: ["class-sections", { academic_year: year.id, page_size: 100 }],
      queryFn: () => academicsApi.classSections.list({ academic_year: year.id, page_size: 100 }),
    })),
  })
  const groups = sorted.map((year, i) => ({ year, sections: (results[i]?.data?.results ?? []) as ClassSection[] }))
  return {
    groups,
    all: groups.flatMap((g) => g.sections),
    isLoading: years.isLoading || results.some((r) => r.isLoading),
  }
}

interface ClassSectionSelectProps {
  school: number | null | undefined
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  allowAll?: boolean
  className?: string
  invalid?: boolean
  id?: string
}

const ANY = "__any__"

/** Teachers work only in their own class section and cannot list the others, so it is shown locked. */
export function ClassSectionSelect(props: ClassSectionSelectProps) {
  const { teacher } = usePanel()
  if (teacher) {
    return (
      <LockedValue
        id={teacher.class_section}
        label={teacher.class_section_detail ? classSectionLabel(teacher.class_section_detail) : "No class assigned"}
        icon={Layers}
        value={props.value}
        onChange={props.onChange}
        className={props.className}
        ariaLabel="Class section"
      />
    )
  }
  return <ClassSectionChooser {...props} />
}

function ClassSectionChooser({ school, value, onChange, placeholder = "Select class section", allowAll, className, invalid, id }: ClassSectionSelectProps) {
  const { groups, isLoading } = useSchoolClassSections(school)
  const empty = !isLoading && groups.every((g) => g.sections.length === 0)

  return (
    <Select
      value={value ? String(value) : allowAll ? ANY : ""}
      onValueChange={(v) => onChange(v === ANY ? null : Number(v))}
      disabled={!school || isLoading}
    >
      <SelectTrigger id={id} aria-label={placeholder} aria-invalid={invalid || undefined} className={cn("h-9 w-full", className)}>
        <SelectValue placeholder={!school ? "Pick a school first" : isLoading ? "Loading sections" : empty ? "No class sections yet" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ANY}>All class sections</SelectItem>}
        {groups.map(
          ({ year, sections }) =>
            sections.length > 0 && (
              <SelectGroup key={year.id}>
                <SelectLabel>
                  {year.name}
                  {year.is_active && " (active)"}
                </SelectLabel>
                {sections.map((cs) => (
                  <SelectItem key={cs.id} value={String(cs.id)}>
                    {classSectionLabel(cs)}
                  </SelectItem>
                ))}
              </SelectGroup>
            )
        )}
      </SelectContent>
    </Select>
  )
}

export function AcademicYearSelect({
  school,
  value,
  onChange,
  className,
  id,
  invalid,
}: {
  school: number | null | undefined
  value: number | null
  onChange: (value: number | null) => void
  className?: string
  id?: string
  invalid?: boolean
}) {
  const { data: years = [], isLoading } = useAcademicYears(school)
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))} disabled={!school || isLoading}>
      <SelectTrigger id={id} aria-label="Academic year" aria-invalid={invalid || undefined} className={cn("h-9 w-full", className)}>
        <SelectValue placeholder={!school ? "Pick a school first" : years.length ? "Select academic year" : "No academic years"} />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y.id} value={String(y.id)}>
            {y.name}
            {y.is_active && " (active)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
