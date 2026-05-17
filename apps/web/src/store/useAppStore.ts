import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppUser {
  id: string
  email: string
  name?: string
}

interface AppStore {
  user: AppUser | null
  setUser: (user: AppUser | null) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: 'app-store' },
  ),
)
