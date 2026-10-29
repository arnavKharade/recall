import {
  Files,
  MessageSquareText,
  Clock3,
  ArrowUpRight,
  ArrowRight,
  FileText,
  FileSpreadsheet,
  FileImage,
  Sparkles,
  Plus,
} from 'lucide-react'

const stats = [
  {
    label: 'Total documents',
    value: '24',
    detail: 'Across your workspace',
    icon: Files,
  },
  {
    label: 'Questions asked',
    value: '86',
    detail: 'Across all conversations',
    icon: MessageSquareText,
  },
  {
    label: 'Recently added',
    value: '6',
    detail: 'In the last 7 days',
    icon: Clock3,
  },
]

const recentDocuments = [
  {
    name: 'Machine Learning Fundamentals',
    type: 'PDF document',
    date: 'Today, 10:42 AM',
    size: '4.2 MB',
    icon: FileText,
  },
  {
    name: 'Quarterly Business Report',
    type: 'PDF document',
    date: 'Yesterday, 4:18 PM',
    size: '2.8 MB',
    icon: FileSpreadsheet,
  },
  {
    name: 'Research Notes — Neural Networks',
    type: 'PDF document',
    date: 'Oct 26, 2026',
    size: '1.6 MB',
    icon: FileImage,
  },
]

function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome section */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Thursday, October 29, 2026
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Welcome back.
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Your documents hold the answers. Let&apos;s find something useful.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus size={17} />
          Upload a document
        </button>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <article
              key={stat.label}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>

                <div className="rounded-lg bg-surface-secondary p-2 text-muted-foreground">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {stat.detail}
              </p>
            </article>
          )
        })}
      </section>

      {/* Ask Recall callout */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface transition-colors">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs font-medium text-foreground">
              <Sparkles size={14} />
              AI-powered knowledge
            </div>

            <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Your documents. One conversation.
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ask questions across your research papers, notes, and reports.
              Get contextual answers with references to the original sources.
            </p>

            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              Start a conversation
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="hidden h-28 w-28 items-center justify-center rounded-2xl bg-surface-secondary text-muted-foreground md:flex">
            <MessageSquareText size={44} strokeWidth={1.2} />
          </div>
        </div>
      </section>

      {/* Recent documents */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Recent documents
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Pick up where you left off.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {recentDocuments.map((document, index) => {
            const Icon = document.icon

            return (
              <div
                key={document.name}
                className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-hover ${
                  index !== recentDocuments.length - 1
                    ? 'border-b border-border'
                    : ''
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted-foreground">
                  <Icon size={19} strokeWidth={1.7} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {document.name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {document.type} · {document.date}
                  </p>
                </div>

                <span className="hidden text-xs text-muted-foreground sm:block">
                  {document.size}
                </span>

                <button
                  type="button"
                  aria-label={`Open ${document.name}`}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground"
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Sample dashboard data — real documents will appear once the backend
          is connected.
        </p>
      </section>
    </div>
  )
}

export default Dashboard
