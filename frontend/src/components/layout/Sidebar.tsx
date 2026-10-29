import {
  LayoutDashboard,
  Files,
  MessageSquareText,
  FolderOpen,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Brain,
} from 'lucide-react'

import { NavLink } from 'react-router-dom'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

const navigation = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'My Documents',
    path: '/documents',
    icon: Files,
  },
  {
    label: 'Ask Recall',
    path: '/ask',
    icon: MessageSquareText,
  },
  {
    label: 'Collections',
    path: '/collections',
    icon: FolderOpen,
  },
]

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Branding */}
      <div
        className={`flex h-20 shrink-0 items-center border-b border-border ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-5'
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Brain size={20} />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Recall
            </h1>

            <p className="truncate text-xs text-muted-foreground">
              Your knowledge, connected.
            </p>
          </div>
        )}
      </div>

      {/* Main navigation */}
      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-6"
      >
        {!collapsed && (
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
        )}

        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors ${
                  collapsed
                    ? 'justify-center px-2'
                    : 'gap-3 px-3'
                } ${
                  isActive
                    ? 'bg-primary-subtle text-primary'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`
              }
            >
              <Icon size={19} strokeWidth={1.8} className="shrink-0" />

              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="shrink-0 space-y-1 border-t border-border p-3">
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          aria-label="Settings"
          className={({ isActive }) =>
            `flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors ${
              collapsed
                ? 'justify-center px-2'
                : 'gap-3 px-3'
            } ${
              isActive
                ? 'bg-primary-subtle text-primary'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            }`
          }
        >
          <Settings size={19} strokeWidth={1.8} className="shrink-0" />

          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex min-h-11 w-full items-center rounded-lg text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground ${
            collapsed
              ? 'justify-center px-2'
              : 'gap-3 px-3'
          }`}
        >
          {collapsed ? (
            <PanelLeft size={19} strokeWidth={1.8} />
          ) : (
            <>
              <PanelLeftClose size={19} strokeWidth={1.8} />
              <span>Collapse sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
