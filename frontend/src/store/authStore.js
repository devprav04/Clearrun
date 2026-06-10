import { create } from 'zustand'
import api from '../api/axios'

const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

export const useAuthStore = create((set) => ({
  user: getStoredUser(),

  login: async (username, password) => {
    const { data } = await api.post('auth/login/', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ user: data.user })
    return data.user
  },

  logout: async () => {
    try { await api.post('auth/logout/') } catch { /* ignore — just logging */ }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null })
  },
}))
