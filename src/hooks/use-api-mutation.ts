import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"

import { errorMessage, type ApiResult } from "@/lib/api"

interface Options<TData, TVars> {
  invalidate?: QueryKey[]
  toastSuccess?: boolean
  toastError?: boolean
  onSuccess?: (data: TData, vars: TVars) => void
  /**
   * Runs instead of `onSuccess` when the change was saved on the device to sync later,
   * so there is no server data yet. Give it whenever `onSuccess` reads `data`.
   */
  onQueued?: (vars: TVars) => void
  onError?: (error: unknown) => void
}

/**
 * Mutation that toasts the backend's own success/error message and refetches the
 * `invalidate` query key prefixes on success. Turn `toastError` off when the form
 * shows field errors itself. Offline, the change is saved to sync later (see
 * lib/offline-queue.ts): that is toasted as saved, and `onQueued` runs if given,
 * otherwise `onSuccess` (with no data).
 */
export function useApiMutation<TData, TVars = void>(
  fn: (vars: TVars) => Promise<ApiResult<TData>>,
  { invalidate = [], toastSuccess = true, toastError = true, onSuccess, onQueued, onError }: Options<TData, TVars> = {}
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async ({ message, data, queued }, vars) => {
      if (queued) {
        toast.info("Saved offline", { description: message })
        if (onQueued) onQueued(vars)
        else onSuccess?.(data, vars)
        return
      }
      if (toastSuccess) toast.success(message)
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      onSuccess?.(data, vars)
    },
    onError: (error) => {
      if (toastError) toast.error(errorMessage(error))
      onError?.(error)
    },
  })
}
