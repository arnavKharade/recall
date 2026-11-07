
import {
  Bell,
  Search,
  Plus,
  LogOut,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'

type HeaderProps = {
  title: string
  description: string
}

function Header({ title, description }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') ?? 'U'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-surface px-4 py-4 transition-colors sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>

        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
          {description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 md:flex">
          <Search
            size={16}
            className="shrink-0 text-muted-foreground"
          />

          <input
            type="search"
            placeholder="Search your knowledge..."
            aria-label="Search your knowledge"
            className="w-36 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground lg:w-48"
          />

          <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-muted-foreground">
            /
          </kbd>
        </div>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex"
        >
          <Plus size={16} />
          <span className="hidden lg:inline">Add document</span>
          <span className="lg:hidden">Add</span>
        </button>

        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative rounded-lg border border-border bg-surface p-2.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Bell size={18} strokeWidth={1.8} />

          <span
            aria-hidden="true"
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary"
          />
        </button>

        <div className="flex items-center gap-2">
          <div
            title={user?.name ?? 'User'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary"
          >
            {initials}
          </div>

          <div className="hidden min-w-0 lg:block">
            <p className="max-w-32 truncate text-xs font-medium text-foreground">
              {user?.name}
            </p>
            <p className="max-w-32 truncate text-[11px] text-muted-foreground">
              {user?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-destructive"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
