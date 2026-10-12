import { toast } from "sonner"

import { ApiError, errorMessage } from "./api"
import { jobsApi } from "./endpoints"
import type { AIJob } from "./types"

const MAX_POLL_FAILURES = 5

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function isJob<T = unknown>(value: unknown): value is AIJob<T> {
  return !!value && typeof value === "object" && "done" in value && "status" in value && "id" in value
}

/**
 * Polls a background AI job until it finishes, calling `onProgress` with each update.
 * Up to MAX_POLL_FAILURES polls in a row may fail (deploys, flaky network) since the
 * job keeps running on the server. A failed job rejects with the same ApiError the
 * endpoint would have returned inline, so callers keep their existing error handling.
 */
export async function waitForJob<T>(job: AIJob<T>, onProgress?: (job: AIJob<T>) => void): Promise<AIJob<T>> {
  let current = job
  let failures = 0

  onProgress?.(current)

  while (!current.done) {
    await sleep((current.poll_after ?? 2) * 1000)
    try {
      current = await jobsApi.get<T>(current.id)
      failures = 0
      onProgress?.(current)
    } catch (err) {
      if ((err instanceof ApiError && err.status === 404) || ++failures >= MAX_POLL_FAILURES) throw err
    }
  }

  if (current.status === "FAILED") {
    throw new ApiError(current.error_status ?? 500, current.error || "Processing failed.", current.errors ?? {})
  }
  return current
}

/**
 * Starts a job with `start` and waits for it, resolving to `{message, data: result}`:
 * the shape `useApiMutation` expects, as if the endpoint had answered with the result.
 */
export async function runJob<T>(
  start: Promise<{ message: string; data: AIJob<T> }>,
  onProgress?: (job: AIJob<T>) => void
): Promise<{ message: string; data: T }> {
  const { data } = await start
  const done = await waitForJob(data, onProgress)
  return { message: done.message, data: done.result as T }
}

/**
 * Follows a job after its dialog has closed, with a toast that turns into the outcome.
 * `onSettled` runs either way, e.g. to refresh lists the job changed.
 */
export function followJobInToast(job: AIJob | null | undefined, loading: string, onSettled?: () => void) {
  if (!job) return
  const finished = waitForJob(job)
  toast.promise(finished, {
    loading,
    success: (done) => done.message,
    error: (err) => errorMessage(err),
  })
  finished.catch(() => undefined).finally(onSettled)
}
