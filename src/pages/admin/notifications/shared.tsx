import { Download, FileText, ImageIcon, Paperclip } from "lucide-react"

import { Pill } from "@/components/admin/ui-bits"
import { formatBytes } from "@/lib/format"
import type { Attachment, SentNotification } from "@/lib/types"

/** Short pills describing who a sent notification went to. */
export function AudiencePills({ n }: { n: SentNotification }) {
  const parts: string[] = []
  if (n.to_school_admins) parts.push("School admins")
  if (n.to_teachers) parts.push("Teachers")
  if (n.to_parents) parts.push("Parents")
  if (n.target_users.length) parts.push(`${n.target_users.length} user(s)`)
  if (n.target_students.length) parts.push(`Parents of ${n.target_students.length} student(s)`)
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <Pill key={p} tone="gray" className="h-5 px-2 text-[11px]">
          {p}
        </Pill>
      ))}
    </div>
  )
}

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {attachments.map((a) => (
        <li key={a.id}>
          <a
            href={a.file}
            target="_blank"
            rel="noreferrer"
            download={a.original_name}
            className="group flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-border">
              {a.content_type.startsWith("image/") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.original_name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
            </span>
            <Download className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5 group-hover:text-primary" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function AttachmentCount({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Paperclip className="size-3" />
      {count}
    </span>
  )
}

export function ReadProgress({ read, total }: { read: number | null; total: number }) {
  const pct = total ? Math.round(((read ?? 0) / total) * 100) : 0
  return (
    <div className="w-28">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {read ?? 0} of {total} read
      </p>
    </div>
  )
}
