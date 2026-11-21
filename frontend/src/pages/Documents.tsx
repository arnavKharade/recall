
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Files,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import { API_BASE_URL, ApiError, api, apiRequest, getAccessToken } from '../services/api'
import Dropdown from '../components/ui/Dropdown'

interface DocumentItem {
  id: string
  collection_id: string | null
  original_filename: string
  mime_type: string
  size_bytes: number
  page_count: number | null
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  uploaded_at: string
  processed_at: string | null
}

interface Collection {
  id: string
  name: string
  description: string | null
  document_count: number
  created_at: string
  updated_at: string
}

type CollectionFilter = 'all' | 'unassigned' | string
type UploadProgress = {
  fileName: string
  fileIndex: number
  total: number
  stage: 'uploading' | 'processing'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (typeof error.detail === 'string') return error.detail
    return error.message
  }

  if (error instanceof Error) return error.message

  return 'Something went wrong. Please try again.'
}

function StatusBadge({ status }: { status: DocumentItem['status'] }) {
  const styles = {
    uploaded: 'bg-surface-secondary text-muted-foreground',
    processing: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-emerald-500/10 text-emerald-500',
    failed: 'bg-red-500/10 text-red-500',
  }

  const labels = {
    uploaded: 'Uploaded',
    processing: 'Processing',
    completed: 'Ready',
    failed: 'Failed',
  }

  const icons = {
    uploaded: <Clock3 size={13} />,
    processing: <LoaderCircle size={13} className="animate-spin" />,
    completed: <CheckCircle2 size={13} />,
    failed: <AlertCircle size={13} />,
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {icons[status]}
      {labels[status]}
    </span>
  )
}

export default function Documents() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [collections, setCollections] = useState<Collection[]>([])

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set())

  const [search, setSearch] = useState('')
  const [collectionFilter, setCollectionFilter] =
    useState<CollectionFilter>('all')
  const [uploadCollectionId, setUploadCollectionId] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadCollections = useCallback(async () => {
    try {
      const result = await api.get<Collection[]>('/collections')
      setCollections(result)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  const loadDocuments = useCallback(async () => {
    try {
      setError('')

      let endpoint = '/documents'

      if (collectionFilter === 'unassigned') {
        endpoint += '?unassigned=true'
      } else if (collectionFilter !== 'all') {
        endpoint += `?collection_id=${encodeURIComponent(collectionFilter)}`
      }

      const result = await api.get<DocumentItem[]>(endpoint)
      setDocuments(result)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [collectionFilter])

  useEffect(() => {
    void loadCollections()
  }, [loadCollections])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  async function processDocument(documentId: string): Promise<boolean> {
    setProcessingIds((previous) => new Set(previous).add(documentId))
    setError('')

    try {
      await api.post(`/documents/${documentId}/process`)
      return true
    } catch (err) {
      setError(getErrorMessage(err))
      return false
    } finally {
      setProcessingIds((previous) => {
        const next = new Set(previous)
        next.delete(documentId)
        return next
      })

      await loadDocuments()
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (!files.length) return

    const invalidFile = files.find(
      (file) =>
        !file.name.toLowerCase().endsWith('.pdf') ||
        file.size > 25 * 1024 * 1024,
    )

    if (invalidFile) {
      setError(
        invalidFile.size > 25 * 1024 * 1024
          ? `${invalidFile.name} exceeds the 25 MB upload limit.`
          : `${invalidFile.name} is not a PDF file.`,
      )
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    let uploadedCount = 0
    let processedCount = 0
    let failedCount = 0

    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress({
          fileName: file.name,
          fileIndex: index + 1,
          total: files.length,
          stage: 'uploading',
        })

        try {
          const formData = new FormData()
          formData.append('file', file)

          const endpoint = uploadCollectionId
            ? `/documents/upload?collection_id=${encodeURIComponent(uploadCollectionId)}`
            : '/documents/upload'

          const uploaded = await api.post<DocumentItem>(
            endpoint,
            formData,
          )

          uploadedCount++
          setDocuments((current) => [
            uploaded,
            ...current.filter((document) => document.id !== uploaded.id),
          ])
          setUploadProgress({
            fileName: file.name,
            fileIndex: index + 1,
            total: files.length,
            stage: 'processing',
          })

          const processed = await processDocument(uploaded.id)

          if (processed) {
            processedCount++
          } else {
            failedCount++
          }
        } catch (err) {
          failedCount++
          setError(`${file.name}: ${getErrorMessage(err)}`)
        }
      }

      await loadDocuments()
      await loadCollections()

      if (uploadedCount > 0 && failedCount === 0) {
        setSuccess(
          uploadedCount === 1
            ? 'Your PDF has been uploaded and processed.'
            : `${processedCount} PDFs have been uploaded and processed.`,
        )
      } else if (uploadedCount > 0) {
        setSuccess(
          `${uploadedCount} uploaded, ${processedCount} processed, ${failedCount} failed.`,
        )
      }
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  async function handleMoveDocument(
    document: DocumentItem,
    newCollectionId: string,
  ) {
    const collectionId = newCollectionId || null

    if (document.collection_id === collectionId) return

    setMovingIds((previous) => new Set(previous).add(document.id))
    setError('')
    setSuccess('')

    try {
      await apiRequest<DocumentItem>(
        `/documents/${document.id}/collection`,
        {
          method: 'PATCH',
          body: {
            collection_id: collectionId,
          },
        },
      )

      setSuccess(
        collectionId
          ? `"${document.original_filename}" moved successfully.`
          : `"${document.original_filename}" removed from its collection.`,
      )

      await loadDocuments()
      await loadCollections()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setMovingIds((previous) => {
        const next = new Set(previous)
        next.delete(document.id)
        return next
      })
    }
  }

  async function handleDelete(document: DocumentItem) {
    const confirmed = window.confirm(
      `Delete "${document.original_filename}"? This will permanently remove the document and its processed content.`,
    )

    if (!confirmed) return

    setDeletingIds((previous) => new Set(previous).add(document.id))
    setError('')
    setSuccess('')

    try {
      await api.delete(`/documents/${document.id}`)

      setDocuments((previous) =>
        previous.filter((item) => item.id !== document.id),
      )

      setSuccess('Document deleted successfully.')
      await loadCollections()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingIds((previous) => {
        const next = new Set(previous)
        next.delete(document.id)
        return next
      })
    }
  }

  async function handleDownload(document: DocumentItem) {
    setError('')

    try {
      const token = getAccessToken()

      const response = await fetch(
        `${API_BASE_URL}/documents/${document.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Unable to download this document.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')

      link.href = url
      link.download = document.original_filename
      window.document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(url)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const filteredDocuments = documents.filter((document) =>
    document.original_filename.toLowerCase().includes(search.toLowerCase()),
  )

  const readyCount = documents.filter(
    (document) => document.status === 'completed',
  ).length

  const failedCount = documents.filter(
    (document) => document.status === 'failed',
  ).length

  const getCollectionName = (collectionId: string | null) => {
    if (!collectionId) return 'Unassigned'

    return (
      collections.find((collection) => collection.id === collectionId)?.name ??
      'Collection'
    )
  }

  return (
    <section className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            My Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your PDFs and the knowledge Recall extracts from them.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Dropdown
            value={uploadCollectionId}
            onChange={setUploadCollectionId}
            disabled={uploading}
            label="Choose upload collection"
            className="min-w-48"
            options={[
              { value: '', label: 'Upload to: Unassigned' },
              ...collections.map((collection) => ({
                value: collection.id,
                label: `Upload to: ${collection.name}`,
              })),
            ]}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleUpload}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Upload size={17} />
            )}
            {uploading ? 'Working...' : 'Upload PDF'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-500">
          <CheckCircle2 size={18} />
          <p className="flex-1">{success}</p>
          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {uploading && uploadProgress && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-primary/20 bg-primary-subtle/40 p-4"
        >
          <div className="flex items-start gap-3">
            <LoaderCircle size={18} className="mt-0.5 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {uploadProgress.stage === 'uploading'
                  ? 'Uploading PDF'
                  : 'Preparing PDF for search'}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {uploadProgress.fileIndex} of {uploadProgress.total}
                </span>
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground" title={uploadProgress.fileName}>
                {uploadProgress.fileName}
              </p>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10"
                role="progressbar"
                aria-label={uploadProgress.stage === 'uploading' ? 'Uploading PDF' : 'Preparing PDF for search'}
              >
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {uploadProgress.stage === 'uploading'
                  ? 'Saving the file to your library…'
                  : 'Extracting text and building searchable passages…'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Total documents</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {documents.length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Ready for questions</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-500">
            {readyCount}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Processing issues</p>
          <p className="mt-2 text-2xl font-semibold text-red-500">
            {failedCount}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Document library
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {documents.length} documents in this view
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Dropdown
            value={collectionFilter}
            onChange={(value) => setCollectionFilter(value as CollectionFilter)}
            label="Filter documents by collection"
            className="min-w-48"
            options={[
              { value: 'all', label: 'All documents' },
              { value: 'unassigned', label: 'Unassigned documents' },
              ...collections.map((collection) => ({
                value: collection.id,
                label: collection.name,
              })),
            ]}
          />

          <div className="relative w-full sm:w-64">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents by filename"
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              void loadDocuments()
              void loadCollections()
            }}
            disabled={loading}
            aria-label="Refresh documents"
            className="rounded-xl border border-border bg-surface p-2.5 text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex min-h-52 items-center justify-center">
          <LoaderCircle
            size={28}
            className="animate-spin text-primary"
          />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
          <div className="rounded-2xl bg-surface-secondary p-4">
            {search ? (
              <Search size={26} className="text-muted-foreground" />
            ) : (
              <Files size={26} className="text-muted-foreground" />
            )}
          </div>

          <h3 className="mt-4 font-semibold text-foreground">
            {search
              ? 'No matching documents'
              : collectionFilter === 'unassigned'
                ? 'No unassigned documents'
                : collectionFilter !== 'all'
                  ? 'No documents in this collection'
                  : 'Your library is empty'}
          </h3>

          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {search
              ? 'Try another search term.'
              : 'Upload a PDF or choose another collection filter.'}
          </p>

          {collectionFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setCollectionFilter('all')}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Show all documents
            </button>
          )}

          {documents.length === 0 && collectionFilter === 'all' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Upload size={16} />
              Upload your first PDF
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-4 p-4 transition hover:bg-surface-secondary/50 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary">
                    <FileText size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      title={document.original_filename}
                    >
                      {document.original_filename}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFileSize(document.size_bytes)}
                      <span className="mx-2">·</span>
                      {document.page_count !== null
                        ? `${document.page_count} pages`
                        : 'Page count unavailable'}
                      <span className="mx-2">·</span>
                      {formatDate(document.uploaded_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderOpen
                      size={15}
                      className="shrink-0 text-muted-foreground"
                    />

                    <Dropdown
                      value={document.collection_id ?? ''}
                      disabled={movingIds.has(document.id)}
                      onChange={(value) => void handleMoveDocument(document, value)}
                      label={`Move ${document.original_filename} to collection`}
                      className="min-w-0 max-w-56 flex-1"
                      options={[
                        { value: '', label: 'Unassigned' },
                        ...collections.map((collection) => ({
                          value: collection.id,
                          label: collection.name,
                        })),
                      ]}
                    />

                    {movingIds.has(document.id) && (
                      <LoaderCircle
                        size={15}
                        className="animate-spin text-primary"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge
                      status={processingIds.has(document.id) ? 'processing' : document.status}
                    />

                    <div className="flex items-center gap-1">
                      {(document.status === 'uploaded' ||
                        document.status === 'failed') && (
                        <button
                          type="button"
                          title="Process document"
                          aria-label={`Process ${document.original_filename}`}
                          disabled={processingIds.has(document.id)}
                          onClick={() => void processDocument(document.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                        >
                          {processingIds.has(document.id) ? (
                            <LoaderCircle
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <RefreshCw size={17} />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        title="Download PDF"
                        aria-label={`Download ${document.original_filename}`}
                        onClick={() => void handleDownload(document)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
                      >
                        <Download size={17} />
                      </button>

                      <button
                        type="button"
                        title="Delete document"
                        aria-label={`Delete ${document.original_filename}`}
                        disabled={deletingIds.has(document.id)}
                        onClick={() => void handleDelete(document)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                      >
                        {deletingIds.has(document.id) ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground sm:hidden">
                    Collection: {getCollectionName(document.collection_id)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Showing {filteredDocuments.length} of {documents.length} documents
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        PDF files only. Maximum file size: 25 MB per document.
      </p>
    </section>
  )
}
