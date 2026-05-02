import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/api'

export interface StoredAccount {
  token: string
  user: User
}

interface AuthState {
  currentUser: User | null
  token: string | null
  accounts: StoredAccount[]
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  addAccount: (token: string, user: User) => void
  switchAccount: (userId: string) => void
  removeAccount: (userId: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      token: null,
      accounts: [],

      login: (token: string, user: User) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token)
        }
        // Add/update in accounts list and set as current
        const accounts = get().accounts.filter((a) => a.user.id !== user.id)
        accounts.unshift({ token, user })
        set({ token, currentUser: user, accounts })
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
        set({ token: null, currentUser: null, accounts: [] })
      },

      setUser: (user: User) => {
        // Update user in accounts list too
        const accounts = get().accounts.map((a) =>
          a.user.id === user.id ? { ...a, user } : a
        )
        set({ currentUser: user, accounts })
      },

      addAccount: (token: string, user: User) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token)
        }
        const accounts = get().accounts.filter((a) => a.user.id !== user.id)
        accounts.push({ token, user })
        set({ token, currentUser: user, accounts })
      },

      switchAccount: (userId: string) => {
        const account = get().accounts.find((a) => a.user.id === userId)
        if (!account) return
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', account.token)
        }
        set({ token: account.token, currentUser: account.user })
      },

      removeAccount: (userId: string) => {
        const accounts = get().accounts.filter((a) => a.user.id !== userId)
        const isCurrent = get().currentUser?.id === userId
        if (isCurrent) {
          const next = accounts[0]
          if (next) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', next.token)
            }
            set({ accounts, token: next.token, currentUser: next.user })
          } else {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token')
            }
            set({ accounts: [], token: null, currentUser: null })
          }
        } else {
          set({ accounts })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
        accounts: state.accounts,
      }),
    }
  )
)
