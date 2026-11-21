import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'

const pageMetadata: Record<
  string,
  { title: string; description: string }
> = {
  '/': {
    title: 'Dashboard',
    description: 'Your personal knowledge workspace.',
  },
  '/documents': {
    title: 'My Documents',
    description: 'Manage and explore your document library.',
  },
  '/ask': {
    title: 'Ask Recall',
    description: 'Get answers grounded in your documents.',
  },
  '/collections': {
    title: 'Collections',
    description: 'Organize your documents into collections.',
  },
  '/settings': {
    title: 'Settings',
    description: 'Manage your workspace preferences.',
  },
}

function MainLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const page = pageMetadata[location.pathname] ?? {
    title: 'Recall',
    description: 'Your personal knowledge workspace.',
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={page.title}
          description={page.description}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px] min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
