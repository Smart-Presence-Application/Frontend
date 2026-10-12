import type { WorkDayType } from "@/lib/types"

export const DAY_TYPE_LABEL: Record<WorkDayType, string> = { FULL_DAY: "Full day", HALF_DAY: "Half day", ABSENT: "Absent" }

/** "7h 45m" from minutes. */
export function durationLabel(minutes?: number | null) {
  if (minutes === null || minutes === undefined) return "-"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Wall-clock HH:MM in the school's time zone, which the verify endpoint expects. */
const hhmmFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" })
export function toHHMM(value?: string | null) {
  return value ? hhmmFmt.format(new Date(value)) : ""
}
