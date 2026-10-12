const CONFIGURED_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "")

/**
 * In development every request goes through the Vite proxy (same origin), even when
 * VITE_API_BASE_URL is an absolute URL such as http://127.0.0.1:8000/api. The auth
 * cookies are SameSite=Lax, so calling another origin directly would drop them and
 * every request after login would come back 401. vite.config.ts proxies to that URL.
 */
const API_BASE =
  import.meta.env.DEV && /^https?:\/\//.test(CONFIGURED_BASE) ? new URL(CONFIGURED_BASE).pathname.replace(/\/$/, "") : CONFIGURED_BASE

type ApiErrors = Record<string, unknown>

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data?: T
  errors?: ApiErrors
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** First readable message found anywhere inside a (possibly nested) DRF error payload. */
function firstMessage(value: unknown): string | null {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMessage(item)
      if (found) return found
    }
    return null
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = firstMessage(item)
      if (found) return found
    }
  }
  return null
}

export class ApiError extends Error {
  status: number
  errors: ApiErrors

  constructor(status: number, message: string, errors: ApiErrors = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors ?? {}
  }

  /** First human-readable field error, falling back to the envelope message. */
  get detail(): string {
    return firstMessage(this.errors) ?? this.message
  }

  /** Flattens `{school: {name: ["..."]}}` into `{"school.name": "..."}` for form fields. */
  get fields(): Record<string, string> {
    const out: Record<string, string> = {}
    const walk = (value: unknown, prefix: string) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, inner] of Object.entries(value)) walk(inner, prefix ? `${prefix}.${key}` : key)
        return
      }
      const message = firstMessage(value)
      if (message && prefix) out[prefix] = message
    }
    walk(this.errors, "")
    return out
  }
}

/** Human readable message for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail
  return "Could not reach the server. Check your connection and try again."
}

type Primitive = string | number | boolean | null | undefined
export type QueryParams = Record<string, Primitive | Primitive[]>

/** Builds a query string, dropping empty values so filters stay optional. */
function toQuery(params?: QueryParams): string {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) {
      if (v === undefined || v === null || v === "") continue
      search.append(key, String(v))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

/** Builds multipart bodies; arrays become repeated keys, which DRF reads as lists. */
export function toFormData(fields: Record<string, unknown>): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) {
      if (v === undefined || v === null || v === "") continue
      form.append(key, v instanceof Blob ? v : String(v))
    }
  }
  return form
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; skipRefresh?: boolean; params?: QueryParams }

let refreshing: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_BASE}/auth/refresh/`, { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** Listeners notified when the session can no longer be refreshed. */
const sessionExpiredListeners = new Set<() => void>()
export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

/** Listeners told when the server answers that it is in maintenance mode. */
const maintenanceListeners = new Set<(message: string) => void>()
export function onMaintenance(listener: (message: string) => void) {
  maintenanceListeners.add(listener)
  return () => {
    maintenanceListeners.delete(listener)
  }
}

function checkMaintenance(status: number, payload: ApiEnvelope<unknown> | null) {
  if (status === 503 && payload?.errors && (payload.errors as Record<string, unknown>).maintenance) {
    maintenanceListeners.forEach((fn) => fn(payload.message ?? ""))
  }
}

/**
 * Full envelope request: resolves to `{message, data}` so callers can surface the
 * server message. On a 401 the access cookie is rotated once via the refresh cookie
 * and the request retried.
 */
export async function request<T>(
  path: string,
  { body, skipRefresh, headers, params, ...init }: RequestOptions = {}
): Promise<{ message: string; data: T }> {
  const isForm = body instanceof FormData
  const res = await fetch(`${API_BASE}/${path.replace(/^\//, "")}${toQuery(params)}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  if (res.status === 401 && !skipRefresh) {
    if (await refreshSession()) return request<T>(path, { body, headers, params, ...init, skipRefresh: true })
    sessionExpiredListeners.forEach((fn) => fn())
  }

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await res.json()) as ApiEnvelope<T>
  } catch {}

  checkMaintenance(res.status, payload)

  if (!res.ok || !payload?.success) {
    const fallback = res.status >= 500 ? "The server is unavailable. Please try again shortly." : "Request failed."
    throw new ApiError(res.status, payload?.message ?? fallback, payload?.errors)
  }
  return { message: payload.message, data: payload.data as T }
}

export async function api<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await request<T>(path, options)).data
}

/** Fetches a file (e.g. an Excel report) and hands it to the browser to save. */
export async function downloadFile(path: string, params?: QueryParams, fallbackName = "download", retried = false): Promise<void> {
  const res = await fetch(`${API_BASE}/${path.replace(/^\//, "")}${toQuery(params)}`, { credentials: "include" })

  if (res.status === 401 && !retried) {
    if (await refreshSession()) return downloadFile(path, params, fallbackName, true)
    sessionExpiredListeners.forEach((fn) => fn())
  }

  if (!res.ok) {
    let payload: ApiEnvelope<unknown> | null = null
    try {
      payload = (await res.json()) as ApiEnvelope<unknown>
    } catch {}
    checkMaintenance(res.status, payload)
    throw new ApiError(res.status, payload?.message ?? "Download failed.", payload?.errors)
  }

  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type Role = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT"

export interface User {
  id: number
  email: string | null
  name: string
  gender: "MALE" | "FEMALE" | "OTHER" | null
  profile_image: string | null
  phone_number: string | null
  role: Role
  updated_at: string
  is_active: boolean
}

export const authApi = {
  staffLogin: (email: string, password: string) =>
    api<{ user: User }>("auth/login/", { method: "POST", body: { email, password }, skipRefresh: true }),
  parentLogin: (phone_number: string, password: string) =>
    api<{ user: User; must_change_password: boolean }>("parents/login/", {
      method: "POST",
      body: { phone_number, password },
      skipRefresh: true,
    }),
  logout: () => api<null>("auth/logout/", { method: "POST", skipRefresh: true }),
  profile: () => api<{ user: User }>("auth/profile/", { skipRefresh: false }),
}
