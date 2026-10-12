import type { ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"

import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EmptyState, ErrorState } from "./states"

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  hideBelow?: "sm" | "md" | "lg" | "xl"
}

const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" }

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => number | string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  onRowClick?: (row: T) => void
  empty?: ReactNode
  selectable?: boolean
  selected?: Set<number | string>
  onSelectedChange?: (next: Set<number | string>) => void
  skeletonRows?: number
  className?: string
}

/**
 * Table with loading, empty and error states. Columns with `hideBelow` are hidden on
 * narrow screens (the rest still scroll horizontally), and a thin progress bar shows
 * while existing data refetches so the table does not flash.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  onRowClick,
  empty,
  selectable,
  selected = new Set(),
  onSelectedChange,
  skeletonRows = 6,
  className,
}: DataTableProps<T>) {
  const keys = rows?.map(rowKey) ?? []
  const allChecked = keys.length > 0 && keys.every((k) => selected.has(k))
  const someChecked = keys.some((k) => selected.has(k))

  function toggleAll() {
    const next = new Set(selected)
    if (allChecked) keys.forEach((k) => next.delete(k))
    else keys.forEach((k) => next.add(k))
    onSelectedChange?.(next)
  }

  function toggle(key: number | string) {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectedChange?.(next)
  }

  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />

  const showSkeleton = loading && !rows
  const isEmpty = !loading && rows && rows.length === 0

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {loading && rows && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/10"
          >
            <motion.div
              className="h-full w-1/3 bg-primary"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {selectable && (
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows on this page"
                  disabled={!rows?.length}
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "h-11 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:pl-4 last:pr-4",
                  col.hideBelow && HIDE[col.hideBelow],
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {showSkeleton &&
            Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {selectable && (
                  <TableCell className="pl-4">
                    <Skeleton className="size-4 rounded" />
                  </TableCell>
                )}
                {columns.map((col, j) => (
                  <TableCell key={col.key} className={cn("py-3.5 first:pl-4", col.hideBelow && HIDE[col.hideBelow])}>
                    <Skeleton className={cn("h-4", j === 0 ? "w-40" : "w-20")} />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {rows?.map((row, index) => {
            const key = rowKey(row)
            const isSelected = selected.has(key)
            return (
              <motion.tr
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.025, 0.3) }}
                data-state={isSelected ? "selected" : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-primary/5",
                  onRowClick && "cursor-pointer"
                )}
              >
                {selectable && (
                  <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggle(key)} aria-label="Select row" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn("py-3 first:pl-4 last:pr-4", col.hideBelow && HIDE[col.hideBelow], col.className)}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </motion.tr>
            )
          })}
        </TableBody>
      </Table>

      {isEmpty && (empty ?? <EmptyState title="Nothing here yet" description="Try changing the filters." />)}
    </div>
  )
}
