import type { Gender } from "@/lib/types"

export const GENDERS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
]

/** Builds a CSV in the browser and hands it to the user as a download. */
export function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  const text = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([text + "\n"], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
