import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { useAcademicYears } from "@/components/admin/pickers"
import { useUrlState } from "@/hooks/use-url-state"
import { academicsApi } from "@/lib/endpoints"
import type { DayType } from "@/lib/types"

/** URL keys used by the tab filters; cleared when switching tab or school. */
const FILTER_KEYS = ["search", "is_active", "year", "school_class", "section", "month", "day_type", "ordering", "page", "page_size"]

export function clearedFilters(): Record<string, null> {
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, null]))
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, i) => ({ value: String(i + 1), label }))

/** Backend weekday numbering: 0 = Monday .. 6 = Sunday. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, value) => ({ value, label }))

export const DAY_TYPES: { value: DayType; label: string; tone: "green" | "red" | "gray" | "amber" }[] = [
  { value: "WORKING", label: "Working", tone: "green" },
  { value: "HOLIDAY", label: "Holiday", tone: "red" },
  { value: "WEEKEND", label: "Weekend", tone: "gray" },
  { value: "EVENT", label: "Event", tone: "amber" },
]

/** Splits free text on commas and new lines, trimming and dropping case-insensitive duplicates. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[\n,]+/)) {
    const name = raw.trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
  }
  return out
}

function firstText(value: unknown): string | null {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstText(item)
      if (found) return found
    }
    return null
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = firstText(item)
      if (found) return found
    }
  }
  return null
}

export interface BulkFailure {
  name?: string
  error?: string
  errors?: unknown
  academic_year?: number
  school_class?: number
  section?: number
}

export function failureMessage(f: BulkFailure) {
  return f.error ?? firstText(f.errors) ?? "Could not be created."
}

/** Weekday name for a `YYYY-MM-DD` date. */
export function weekdayOf(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" })
}

/**
 * Academic year in scope for the year-based tabs: the `year` URL param,
 * otherwise the school's active year, otherwise its most recent one.
 */
export function useYearScope(school: number) {
  const url = useUrlState()
  const years = useAcademicYears(school)
  const list = years.data ?? []
  const fromUrl = Number(url.get("year")) || null
  const fallback = list.find((y) => y.is_active) ?? list[0]
  const yearId = fromUrl ?? fallback?.id ?? null
  const year = list.find((y) => y.id === yearId) ?? null
  return {
    yearId,
    year,
    years: list,
    loading: years.isLoading,
    setYear: (id: number | null) => url.set({ year: id }),
  }
}

/** Classes and sections of a school, for filters and the bulk class-section builder. */
export function useSchoolNames(kind: "classes" | "sections", school: number | null | undefined) {
  const params = { school, page_size: 100, ordering: "name" }
  return useQuery({
    queryKey: [kind, params],
    queryFn: () => academicsApi[kind].list(params),
    enabled: !!school,
    select: (d) => d.results,
  })
}

/**
 * Runs `onOpen` during render whenever a dialog switches to open, so its
 * local state starts fresh without a reset effect (React's "adjust state
 * when a prop changes" pattern). `onOpen` must only set this component's state.
 */
export function useOpenReset(open: boolean, onOpen: () => void) {
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) onOpen()
  }
}
