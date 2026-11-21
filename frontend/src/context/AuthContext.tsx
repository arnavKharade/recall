
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  api,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../services/api'

export type User = {
  id: string
  name: string
  email: string
  is_active: boolean
}

type LoginCredentials = {
  email: string
  password: string
}

type RegisterCredentials = LoginCredentials & {
  name: string
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
}

type TokenResponse = {
  access_token: string
  token_type: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(!demoMode)

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const tokenResponse = await api.post<TokenResponse>(
      '/auth/login',
      credentials,
      { auth: false, timeoutMs: 15_000 },
    )

    setAccessToken(tokenResponse.access_token)

    try {
      const currentUser = await api.get<User>('/auth/me', {
        timeoutMs: 15_000,
      })
      setUser(currentUser)
    } catch (error) {
      clearAccessToken()
      setUser(null)
      throw error
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    await api.post<User>('/auth/register', credentials, {
      auth: false,
      timeoutMs: 15_000,
    })

    await login({
      email: credentials.email,
      password: credentials.password,
    })
  }, [login])

  useEffect(() => {
    if (demoMode) return

    let active = true

    async function restoreSession() {
      const token = getAccessToken()

      if (!token) {
        if (active) setIsLoading(false)
        return
      }

      try {
        const currentUser = await api.get<User>('/auth/me', {
          timeoutMs: 15_000,
        })

        if (active) {
          setUser(currentUser)
        }
      } catch {
        clearAccessToken()

        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
