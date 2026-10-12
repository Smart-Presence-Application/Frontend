import { useEffect, useState } from "react"

/**
 * Preview URLs for local files, revoked when the files change or on unmount.
 * They are created in the same effect that revokes them because with useMemo,
 * React's development double-run (or a remount) would revoke URLs still in use.
 */
export function useObjectUrls(blobs: Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    const next = blobs.map((blob) => URL.createObjectURL(blob))
    setUrls(next)
    return () => next.forEach((url) => URL.revokeObjectURL(url))
  }, [blobs])

  return urls
}
