import { useState, type ReactNode } from "react"
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { Trash2, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api"
import type { BulkDeleteResult } from "@/lib/types"
import { ConfirmDialog } from "./confirm-dialog"

type Keys = Set<number | string>

interface BulkDeleteBarProps {
  selected: Keys
  onSelectedChange: (next: Keys) => void
  /** Singular and plural nouns, e.g. ["student", "students"]. */
  noun: [string, string]
  remove: (ids: number[]) => Promise<{ message: string; data: BulkDeleteResult }>
  invalidate: QueryKey[]
  description: ReactNode
}

/**
 * Bar shown above a table while rows are selected, with a confirmed bulk delete.
 * Rows that could not be deleted stay selected so they are easy to find.
 */
export function BulkDeleteBar({ selected, onSelectedChange, noun, remove, invalidate, description }: BulkDeleteBarProps) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const count = selected.size
  const label = `${count} ${count === 1 ? noun[0] : noun[1]}`

  const mutation = useMutation({
    mutationFn: () => remove([...selected].map(Number)),
    onSuccess: async ({ message, data }) => {
      const reasons = [...new Set(data.failed.map((f) => f.reason))].join(" ")
      if (data.failed.length || data.not_found.length) toast.warning(message, { description: reasons || undefined })
      else toast.success(message)
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      onSelectedChange(new Set(data.failed.map((f) => f.id)))
      setConfirming(false)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b bg-primary/5"
          >
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="text-sm font-medium">{count} selected</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
                  <Trash2 /> Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onSelectedChange(new Set())}>
                  <X /> Clear
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        destructive
        icon={Trash2}
        title={`Delete ${label}?`}
        description={description}
        confirmLabel={`Delete ${label}`}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </>
  )
}
