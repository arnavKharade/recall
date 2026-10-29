import { Monitor, Moon, Sun } from 'lucide-react'

import { useTheme, type Theme } from '../../context/ThemeContext'

const themeOptions: {
  value: Theme
  label: string
  icon: typeof Sun
}[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Appearance"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon
        const isActive = theme === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label} theme`}
            aria-pressed={isActive}
            title={`${option.label} theme`}
            onClick={() => setTheme(option.value)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            }`}
          >
            <Icon size={16} strokeWidth={1.8} />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeToggle
