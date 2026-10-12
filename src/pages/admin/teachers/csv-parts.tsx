import { CircleAlert, Download, FileWarning } from "lucide-react"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { ApiError, errorMessage } from "@/lib/api"

export function TemplateButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Download /> Download CSV template
    </Button>
  )
}

const LABELS: Record<string, string> = {
  file: "File",
  school: "School",
  class_section: "Class section",
  non_field_errors: "Upload",
  detail: "Upload",
}

const humanize = (key: string) => LABELS[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())

function messages(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(messages)
  if (value && typeof value === "object") return Object.values(value).flatMap(messages)
  return []
}

interface ErrorGroup {
  title: string
  items: { field?: string; message: string }[]
}

/** Turns `{file:[...]}` or `{"<row>": {field:[...]}}` into readable groups. */
function groupErrors(errors: Record<string, unknown>): ErrorGroup[] {
  const rows: ErrorGroup[] = []
  const general: ErrorGroup = { title: "File", items: [] }

  for (const [key, value] of Object.entries(errors)) {
    if (/^\d+$/.test(key)) {
      const items =
        value && typeof value === "object" && !Array.isArray(value)
          ? Object.entries(value).flatMap(([field, inner]) => messages(inner).map((message) => ({ field: humanize(field), message })))
          : messages(value).map((message) => ({ message }))
      rows.push({ title: `Row ${key}`, items })
    } else {
      general.items.push(...messages(value).map((message) => ({ field: key === "file" ? undefined : humanize(key), message })))
    }
  }

  rows.sort((a, b) => Number(a.title.slice(4)) - Number(b.title.slice(4)))
  return general.items.length ? [general, ...rows] : rows
}

/** Readable list of CSV validation problems returned by a bulk upload. */
export function CsvErrors({ error }: { error: unknown }) {
  if (!error) return null
  const groups = error instanceof ApiError ? groupErrors(error.errors) : []
  const total = groups.reduce((sum, g) => sum + g.items.length, 0)
  const title = error instanceof ApiError ? error.message : errorMessage(error)

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5"
    >
      <div className="flex items-start gap-2 px-3 py-2.5 text-sm font-medium text-destructive">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          {title}
          {total > 0 && <span className="font-normal"> {total} problem{total === 1 ? "" : "s"} found.</span>}
        </span>
      </div>
      {groups.length > 0 && (
        <ul className="max-h-60 divide-y divide-destructive/15 overflow-y-auto border-t border-destructive/20 bg-background/60">
          {groups.map((group) => (
            <li key={group.title} className="flex gap-3 px-3 py-2 text-sm">
              <span className="flex w-16 shrink-0 items-start gap-1.5 font-medium text-foreground">
                <FileWarning className="mt-0.5 size-3.5 text-destructive" />
                {group.title}
              </span>
              <ul className="min-w-0 flex-1 space-y-0.5 text-muted-foreground">
                {group.items.map((item, i) => (
                  <li key={i} className="break-words">
                    {item.field && <span className="font-medium text-foreground">{item.field}: </span>}
                    {item.message}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
