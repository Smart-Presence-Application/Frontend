import { useCallback, useState } from "react"

import { ApiError, errorMessage } from "@/lib/api"

/** Splits an API error into per-field messages and one form-level message. */
export function useFormErrors() {
  const [fields, setFields] = useState<Record<string, string>>({})
  const [form, setForm] = useState<string | null>(null)

  const reset = useCallback(() => {
    setFields({})
    setForm(null)
  }, [])

  const capture = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      const { non_field_errors, detail, ...rest } = err.fields
      setFields(rest)
      setForm(non_field_errors ?? detail ?? (Object.keys(rest).length ? null : err.message))
    } else {
      setFields({})
      setForm(errorMessage(err))
    }
  }, [])

  return { fields, form, reset, capture }
}
