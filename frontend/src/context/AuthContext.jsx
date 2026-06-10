import { useAuthStore } from '../store/authStore'

export function AuthProvider({ children }) {
  return children
}

export function useAuth() {
  const { user, login, logout } = useAuthStore()
  return { user, login, logout, isAuthenticated: Boolean(user) }
}
