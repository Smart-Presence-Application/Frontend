import { useState } from "react"

import { useUrlState } from "./use-url-state"

type Keys = Set<number | string>
const EMPTY: Keys = new Set()

/** Row selection tied to the current page and filters, so it clears itself when what is on screen changes. */
export function usePageSelection() {
  const url = useUrlState()
  const view = url.params.toString()
  const [selection, setSelection] = useState<{ view: string; ids: Keys }>({ view: "", ids: EMPTY })
  const selected = selection.view === view ? selection.ids : EMPTY
  const setSelected = (ids: Keys) => setSelection({ view, ids })
  return { selected, setSelected }
}
