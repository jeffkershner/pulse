import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  setTokens: (data: { access_token: string; refresh_token: string; user_id: string; email: string }) => void
  updateAccessToken: (token: string) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  email: null,
  isAuthenticated: false,

  setTokens: (data) => {
    localStorage.setItem('accessToken', data.access_token)
    localStorage.setItem('refreshToken', data.refresh_token)
    localStorage.setItem('userId', data.user_id)
    localStorage.setItem('email', data.email)
    set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user_id,
      email: data.email,
      isAuthenticated: true,
    })
  },

  updateAccessToken: (token) => {
    localStorage.setItem('accessToken', token)
    set({ accessToken: token })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('email')
    set({
      accessToken: null,
      refreshToken: null,
      userId: null,
      email: null,
      isAuthenticated: false,
    })
  },

  hydrate: () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    const userId = localStorage.getItem('userId')
    const email = localStorage.getItem('email')
    if (accessToken && refreshToken) {
      set({
        accessToken,
        refreshToken,
        userId,
        email,
        isAuthenticated: true,
      })
    }
  },
}))

// Hydrate on module load
useAuthStore.getState().hydrate()
