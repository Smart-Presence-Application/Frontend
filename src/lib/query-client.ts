import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "./api"

/**
 * Shared query client. Queries always try the request (offline, the service worker
 * answers with the last saved copy) and do not retry client errors, which will not
 * fix themselves. Mutations fail straight away offline instead of silently waiting.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
    mutations: { networkMode: "always" },
  },
})
