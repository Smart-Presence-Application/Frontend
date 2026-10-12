const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" })
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" })
const relFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

const parse = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value))

export function formatDate(value?: string | null) {
  return value ? dateFmt.format(parse(value)) : "-"
}

export function formatDateTime(value?: string | null) {
  return value ? dateTimeFmt.format(parse(value)) : "-"
}

export function formatTime(value?: string | null) {
  return value ? timeFmt.format(parse(value)) : "-"
}

export function timeAgo(value?: string | null) {
  if (!value) return "-"
  const seconds = Math.round((parse(value).getTime() - Date.now()) / 1000)
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relFmt.format(Math.round(seconds / size), unit)
  }
  return "just now"
}

/** Local `YYYY-MM-DD`, for date inputs and API date params. */
export function isoDate(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function initials(name?: string | null) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function formatNumber(value?: number | null) {
  return value === undefined || value === null ? "-" : new Intl.NumberFormat("en-IN").format(value)
}

export const ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
} as const

export function classSectionLabel(cs?: { class_name: string; section_name: string; academic_year_name?: string } | null, withYear = false) {
  if (!cs) return "Unassigned"
  const base = `Class ${cs.class_name} - ${cs.section_name}`
  return withYear && cs.academic_year_name ? `${base} (${cs.academic_year_name})` : base
}
