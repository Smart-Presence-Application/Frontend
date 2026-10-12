import { createContext } from "react"

import type { User } from "@/lib/api"

export interface AuthContextValue {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

/**
 * Kept apart from the provider so editing auth.tsx during development does not
 * create a second context that the already mounted provider never supplies.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
