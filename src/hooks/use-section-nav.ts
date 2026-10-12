import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"

/** Smooth-scrolls to a landing section, navigating home first when needed. */
export function useSectionNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return useCallback(
    (id: string) => {
      if (pathname !== "/") {
        navigate("/", { state: { scrollTo: id } })
        return
      }
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      history.replaceState(null, "", id === "home" ? "/" : `#${id}`)
    },
    [navigate, pathname]
  )
}

/**
 * Tracks which section is currently in the middle band of the viewport. Measured
 * on scroll rather than with an observer because sections mount lazily after the navbar.
 */
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.45
        let current = ids[0]
        for (const id of ids) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= line) current = id
        }
        setActive(current)
      })
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [ids])

  return active
}
