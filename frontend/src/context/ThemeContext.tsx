import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'recall-theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getInitialTheme(): Theme {
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEY)

    if (
      storedTheme === 'light' ||
      storedTheme === 'dark' ||
      storedTheme === 'system'
    ) {
      return storedTheme
    }
  } catch {
    // Storage may be unavailable in restricted browser environments.
  }

  return 'system'
}

function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.style.colorScheme = resolvedTheme

  return resolvedTheme
}

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    () => applyTheme(getInitialTheme()),
  )

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch {
      // The theme still works for this session if storage is unavailable.
    }

    setResolvedTheme(applyTheme(nextTheme))
  }, [])

  useEffect(() => {
    if (theme !== 'system') {
      setResolvedTheme(applyTheme(theme))
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateSystemTheme = () => {
      setResolvedTheme(applyTheme('system'))
    }

    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)

    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
