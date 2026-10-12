import { useRef, useState, type KeyboardEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, LoaderCircle, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

export interface ComboOption {
  value: number
  label: string
  sub?: string
}

interface BaseProps {
  queryKey: string
  fetchOptions: (search: string) => Promise<ComboOption[]>
  resolve?: (value: number) => Promise<ComboOption>
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  "aria-label"?: string
}

type SingleProps = BaseProps & {
  multiple?: false
  value: number | null
  onChange: (value: number | null, option?: ComboOption) => void
  clearable?: boolean
}

type MultiProps = BaseProps & {
  multiple: true
  value: number[]
  onChange: (value: number[]) => void
}

/**
 * Searchable, server-backed select for picking schools, users or students. `queryKey`
 * prefixes the option lookups; labels of selected values come from picks made here,
 * the current results, or `resolve` for values not in the results.
 */
export function AsyncCombobox(props: SingleProps | MultiProps) {
  const { queryKey, fetchOptions, resolve, placeholder = "Select", searchPlaceholder = "Search", emptyText = "No matches found." } = props
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [active, setActive] = useState(0)
  const [known, setKnown] = useState<Record<number, ComboOption>>({})
  const debounced = useDebounce(search, 250)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = props.multiple ? props.value : props.value === null ? [] : [props.value]

  const { data: options = [], isFetching } = useQuery({
    queryKey: [queryKey, "options", debounced],
    queryFn: () => fetchOptions(debounced),
    enabled: open,
    placeholderData: keepPreviousData,
  })

  const missing = selected.filter((v) => !known[v] && !options.some((o) => o.value === v))
  const { data: resolved } = useQuery({
    queryKey: [queryKey, "resolve", missing],
    queryFn: () => Promise.all(missing.map((v) => resolve!(v))),
    enabled: !!resolve && missing.length > 0,
  })

  const labelOf = (v: number) => known[v] ?? options.find((o) => o.value === v) ?? resolved?.find((o) => o.value === v)

  function pick(option: ComboOption) {
    setKnown((prev) => ({ ...prev, [option.value]: option }))
    if (props.multiple) {
      props.onChange(props.value.includes(option.value) ? props.value.filter((v) => v !== option.value) : [...props.value, option.value])
    } else {
      props.onChange(option.value, option)
      setOpen(false)
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const next = Math.max(0, Math.min(options.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)))
      setActive(next)
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" })
    } else if (event.key === "Enter" && options[active]) {
      event.preventDefault()
      pick(options[active])
    }
  }

  const triggerLabel = props.multiple
    ? selected.length
      ? `${selected.length} selected`
      : placeholder
    : selected.length
      ? (labelOf(selected[0])?.label ?? "Loading")
      : placeholder

  return (
    <div className={cn("grid gap-2", props.className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={props.id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={props["aria-label"]}
            aria-invalid={props.invalid || undefined}
            disabled={props.disabled}
            className={cn("h-9 w-full justify-between font-normal", !selected.length && "text-muted-foreground")}
          >
            <span className="truncate">{triggerLabel}</span>
            <span className="flex items-center gap-1">
              {!props.multiple && props.clearable && selected.length > 0 && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Clear selection"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onChange(null)
                  }}
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <X className="size-3.5" />
                </span>
              )}
              <ChevronsUpDown className="size-4 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {isFetching && <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />}
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {options.length === 0 && !isFetching && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>}
            {options.map((option, i) => {
              const isSelected = selected.includes(option.value)
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(option)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    i === active && "bg-accent text-accent-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      !props.multiple && "rounded-full"
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.sub && <span className="block truncate text-xs text-muted-foreground">{option.sub}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {props.multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary">
              {labelOf(v)?.label ?? `#${v}`}
              <button
                type="button"
                onClick={() => props.onChange(props.value.filter((x) => x !== v))}
                aria-label={`Remove ${labelOf(v)?.label ?? v}`}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
