import { ApiError } from "@/lib/api"
import type { FaceRegisterResult } from "@/lib/types"

export function percentOf(part?: number | null, total?: number | null) {
  if (!total || part === null || part === undefined) return null
  return Math.round((part / total) * 100)
}

/**
 * Face registration responses carry their per-file results in `data` on
 * success, and in `errors` when nothing was registered (HTTP 400).
 */
export function faceResultFromError(err: unknown): FaceRegisterResult | null {
  if (!(err instanceof ApiError)) return null
  const e = err.errors as Partial<FaceRegisterResult>
  return Array.isArray(e?.results) ? (e as FaceRegisterResult) : null
}
