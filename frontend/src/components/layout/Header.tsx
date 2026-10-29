import {
  Bell,
  Search,
  ChevronDown,
  Plus,
} from 'lucide-react'

type HeaderProps = {
  title: string
  description: string
}

function Header({ title, description }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-surface px-4 py-4 transition-colors sm:px-6 lg:px-8">
      {/* Page information */}
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>

        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
          {description}
        </p>
      </div>

      {/* Header actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Search */}
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

        {/* Add document */}
        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex"
        >
          <Plus size={16} />
          <span className="hidden lg:inline">Add document</span>
          <span className="lg:hidden">Add</span>
        </button>

        {/* Notifications */}
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

        {/* User profile */}
        <button
          type="button"
          aria-label="User profile"
          title="User profile"
          className="flex items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-surface-hover sm:gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary text-xs font-semibold text-foreground">
            AK
          </div>

          <ChevronDown
            size={15}
            className="hidden text-muted-foreground sm:block"
          />
        </button>
      </div>
    </header>
  )
}

export default Header
