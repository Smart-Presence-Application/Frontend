/**
 * Runs `fn` while holding a lock shared by every tab and the service worker
 * (Web Locks), so two of them never refresh the session or upload the same
 * offline item at once. Without Web Locks it simply runs.
 */
export async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined
  if (!locks?.request) return fn()
  return locks.request(name, fn) as Promise<T>
}
