import { Monitor, Palette } from 'lucide-react'

import ThemeToggle from '../components/ui/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

function Settings() {
  const { resolvedTheme } = useTheme()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Customize your Recall workspace.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-foreground">
              <Palette size={19} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Appearance</h2>

              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Choose how Recall looks. Your preference is saved in this
                browser and remembered when you return.
              </p>
            </div>
          </div>

          <ThemeToggle />
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
          <Monitor size={16} />

          <span>
            Currently displaying:{' '}
            <span className="font-medium capitalize text-foreground">
              {resolvedTheme} mode
            </span>
          </span>
        </div>
      </section>
    </div>
  )
}

export default Settings
