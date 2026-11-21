import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Files,
  FolderOpen,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { api, ApiError } from '../services/api'

interface DocumentItem {
  id: string
  original_filename: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  uploaded_at: string
  page_count: number | null
}

interface CollectionItem {
  id: string
  name: string
}

interface ConversationItem {
  id: string
  title: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && typeof error.detail === 'string') {
    return error.detail
  }

  return 'Your workspace could not be loaded. Try refreshing the page.'
}

function formatDate(date: string): string {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''

  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: value.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function getStatus(status: DocumentItem['status']) {
  if (status === 'completed') {
    return {
      label: 'Ready to search',
      icon: <CheckCircle2 size={14} />,
      style: 'bg-success-subtle text-success',
    }
  }

  if (status === 'processing' || status === 'uploaded') {
    return {
      label: status === 'processing' ? 'Processing' : 'Needs processing',
      icon: status === 'processing'
        ? <LoaderCircle size={14} className="animate-spin" />
        : <Clock3 size={14} />,
      style: 'bg-info-subtle text-info',
    }
  }

  return {
    label: 'Processing failed',
    icon: <AlertCircle size={14} />,
    style: 'bg-destructive-subtle text-destructive',
  }
}

function Dashboard() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    Promise.all([
      api.get<DocumentItem[]>('/documents?limit=100'),
      api.get<CollectionItem[]>('/collections'),
      api.get<ConversationItem[]>('/conversations'),
    ])
      .then(([documentData, collectionData, conversationData]) => {
        if (!active) return
        setDocuments(documentData)
        setCollections(collectionData)
        setConversations(conversationData)
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const recentDocuments = documents.slice(0, 5)
  const readyCount = documents.filter((document) => document.status === 'completed').length
  const pendingCount = documents.filter(
    (document) => document.status === 'uploaded' || document.status === 'processing',
  ).length
  const failedCount = documents.filter((document) => document.status === 'failed').length
  const hasDocuments = documents.length > 0
  const greeting = hasDocuments ? 'Welcome back.' : 'Welcome to Recall.'

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {hasDocuments
              ? 'Your documents are ready to explore. Ask a question and follow the answer back to its source.'
              : 'Add a PDF to your library, then ask Recall to find the information inside it.'}
          </p>
        </div>

        <Link
          to="/documents"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Upload size={17} />
          Upload a document
        </Link>
      </section>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive-subtle px-4 py-3 text-sm text-destructive">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Workspace overview">
        {[
          { label: 'Documents', value: documents.length, detail: `${readyCount} ready to search`, icon: Files },
          { label: 'Collections', value: collections.length, detail: 'Organize related files', icon: FolderOpen },
          { label: 'Conversations', value: conversations.length, detail: 'Saved question history', icon: MessageSquareText },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <span className="rounded-lg bg-surface-secondary p-2 text-muted-foreground">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {loading ? <span className="text-muted-foreground">—</span> : stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
            </article>
          )
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs font-medium text-foreground">
              <Sparkles size={14} />
              Answers with page references
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {readyCount > 0 ? 'What would you like to find?' : 'Your documents, easier to search.'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {readyCount > 0
                ? 'Ask in your own words. Recall searches your processed PDFs and shows the passages behind its answer.'
                : 'Once a PDF is processed, ask a question and Recall will look for an answer in its pages.'}
            </p>
            <Link
              to="/ask"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Ask Recall
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hidden h-28 w-28 items-center justify-center rounded-2xl bg-primary-subtle text-primary md:flex">
            <MessageSquareText size={42} strokeWidth={1.4} />
          </div>
        </div>
      </section>

      {(pendingCount > 0 || failedCount > 0) && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-lg bg-warning-subtle p-2 text-warning"><Clock3 size={17} /></span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Document processing needs attention</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {pendingCount > 0 && `${pendingCount} ${pendingCount === 1 ? 'document is' : 'documents are'} not ready to search yet.`}
                {pendingCount > 0 && failedCount > 0 ? ' ' : ''}
                {failedCount > 0 && `${failedCount} ${failedCount === 1 ? 'document failed' : 'documents failed'} processing.`}
              </p>
            </div>
          </div>
          <Link to="/documents" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
            Review documents <ArrowRight size={15} />
          </Link>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent documents</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your latest uploads and their search status.</p>
          </div>
          <Link to="/documents" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            View library <ArrowRight size={15} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <LoaderCircle size={17} className="animate-spin" /> Loading your documents…
            </div>
          ) : recentDocuments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface-secondary text-muted-foreground">
                <FileText size={20} />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">No documents yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload a PDF to start building your searchable library.</p>
              <Link to="/documents" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                Go to document library <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            recentDocuments.map((document, index) => {
              const status = getStatus(document.status)
              return (
                <div
                  key={document.id}
                  className={`flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 ${index !== recentDocuments.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted-foreground">
                    <FileText size={19} strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{document.original_filename}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {document.page_count ? `${document.page_count} pages · ` : ''}{formatDate(document.uploaded_at)}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.style}`}>
                    {status.icon}<span className="hidden sm:inline">{status.label}</span>
                  </span>
                </div>
              )
            })
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Showing your 5 most recent documents.</p>
      </section>
    </div>
  )
}

export default Dashboard
