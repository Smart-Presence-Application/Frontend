import { useCallback } from "react"
import { useSearchParams } from "react-router"

import { usePanel } from "@/context/panel"

/**
 * List filters kept in the URL so views are shareable and survive reloads.
 * Changing any filter other than `page` sends the user back to page 1.
 *
 * In the School Admin panel the `school` filter is pinned to the admin's own
 * school, and in the teacher panel `class_section` is pinned to the teacher's
 * class too, so shared pages need no special casing to stay in scope.
 */
export function useUrlState() {
  const [params, setParams] = useSearchParams()
  const { scopeSchool, teacher } = usePanel()
  const pinnedSchool = scopeSchool ? String(scopeSchool.id) : null
  const pinnedSection = teacher?.class_section ? String(teacher.class_section) : null
  const pinned = useCallback(
    (key: string) => (key === "school" ? pinnedSchool : key === "class_section" ? pinnedSection : null),
    [pinnedSchool, pinnedSection]
  )

  const get = useCallback((key: string, fallback = "") => pinned(key) || params.get(key) || fallback, [params, pinned])

  const set = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (pinned(key)) continue
            if (value === null || value === undefined || value === "") next.delete(key)
            else next.set(key, String(value))
          }
          if (!("page" in patch)) next.delete("page")
          return next
        },
        { replace: true }
      )
    },
    [setParams, pinned]
  )

  const page = Number(params.get("page") ?? 1) || 1
  const pageSize = Number(params.get("page_size") ?? 20) || 20

  return { get, set, page, pageSize, params }
}
