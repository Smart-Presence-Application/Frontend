import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"

import { errorMessage } from "@/lib/api"

interface Options<TData, TVars> {
  invalidate?: QueryKey[]
  toastSuccess?: boolean
  toastError?: boolean
  onSuccess?: (data: TData, vars: TVars) => void
  onError?: (error: unknown) => void
}

/**
 * Mutation that toasts the backend's own success/error message and refetches the
 * `invalidate` query key prefixes on success. Turn `toastError` off when the form
 * shows field errors itself.
 */
export function useApiMutation<TData, TVars = void>(
  fn: (vars: TVars) => Promise<{ message: string; data: TData }>,
  { invalidate = [], toastSuccess = true, toastError = true, onSuccess, onError }: Options<TData, TVars> = {}
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async ({ message, data }, vars) => {
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
