
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  FileText,
  Folder,
  FolderOpen,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { api, apiRequest } from '../services/api'

interface Collection {
  id: string
  name: string
  description: string | null
  document_count: number
  created_at: string
  updated_at: string
}

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCollection, setEditingCollection] =
    useState<Collection | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await api.get<Collection[]>('/collections')
      setCollections(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load collections.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCollections()
  }, [fetchCollections])

  const openCreateModal = () => {
    setEditingCollection(null)
    setName('')
    setDescription('')
    setError('')
    setModalOpen(true)
  }

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection)
    setName(collection.name)
    setDescription(collection.description ?? '')
    setError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return

    setModalOpen(false)
    setEditingCollection(null)
    setName('')
    setDescription('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Please enter a collection name.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      if (editingCollection) {
        await apiRequest<Collection>(
          `/collections/${editingCollection.id}`,
          {
            method: 'PATCH',
            body: {
              name: trimmedName,
              description: description.trim() || null,
            },
          },
        )
      } else {
        await api.post<Collection>('/collections', {
          name: trimmedName,
          description: description.trim() || null,
        })
      }

      setModalOpen(false)
      setEditingCollection(null)
      setName('')
      setDescription('')

      await fetchCollections()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save collection.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (collection: Collection) => {
    const confirmed = window.confirm(
      `Delete "${collection.name}"? Its documents will remain in your library, but will no longer belong to this collection.`,
    )

    if (!confirmed) return

    setError('')

    try {
      await api.delete(`/collections/${collection.id}`)

      setCollections((current) =>
        current.filter((item) => item.id !== collection.id),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete collection.',
      )
    }
  }

  const filteredCollections = collections.filter((collection) => {
    const query = search.toLowerCase()

    return (
      collection.name.toLowerCase().includes(query) ||
      (collection.description ?? '').toLowerCase().includes(query)
    )
  })

  const totalDocuments = collections.reduce(
    (total, collection) => total + collection.document_count,
    0,
  )

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <FolderOpen size={16} />
            <span>Workspace</span>
            <span>/</span>
            <span className="text-[var(--foreground)]">Collections</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Collections
          </h1>

          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Organize your documents into focused knowledge spaces.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus size={17} />
          New collection
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              Total collections
            </p>
            <Folder size={19} className="text-indigo-500" />
          </div>

          <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {collections.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              Organized documents
            </p>
            <FileText size={19} className="text-indigo-500" />
          </div>

          <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {totalDocuments}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              Empty collections
            </p>
            <FolderOpen size={19} className="text-indigo-500" />
          </div>

          <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {collections.filter((item) => item.document_count === 0).length}
          </p>
        </div>
      </div>

      {/* Collection list header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Your collections
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {collections.length} collections in your workspace
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search collections..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && !modalOpen && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {/* Collection content */}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoaderCircle
            size={25}
            className="animate-spin text-indigo-500"
          />
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 text-center">
          <div className="rounded-2xl bg-indigo-500/10 p-4">
            <FolderOpen size={27} className="text-indigo-500" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
            {search ? 'No matching collections' : 'No collections yet'}
          </h3>

          <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
            {search
              ? 'Try another search term.'
              : 'Create your first collection to start organizing your documents.'}
          </p>

          {!search && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <Plus size={16} />
              Create collection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCollections.map((collection) => (
            <div
              key={collection.id}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-indigo-500/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-indigo-500/10 p-3">
                  <Folder size={21} className="text-indigo-500" />
                </div>

                <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEditModal(collection)}
                    title="Edit collection"
                    className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(collection)}
                    title="Delete collection"
                    className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="mt-5 truncate font-semibold text-[var(--foreground)]">
                {collection.name}
              </h3>

              <p className="mt-2 min-h-10 line-clamp-2 text-sm leading-5 text-[var(--muted-foreground)]">
                {collection.description || 'No description provided.'}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <FileText size={15} />
                  {collection.document_count}{' '}
                  {collection.document_count === 1 ? 'document' : 'documents'}
                </div>

                <span className="text-xs text-[var(--muted-foreground)]">
                  Updated{' '}
                  {new Date(collection.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  {editingCollection ? 'Edit collection' : 'Create collection'}
                </h2>

                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Give your collection a name and description.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="collection-name"
                  className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                >
                  Collection name
                </label>

                <input
                  id="collection-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={150}
                  required
                  autoFocus
                  placeholder="e.g. Research papers"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="collection-description"
                  className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                >
                  Description{' '}
                  <span className="font-normal text-[var(--muted-foreground)]">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="collection-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="What kind of documents belong here?"
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {editingCollection ? 'Save changes' : 'Create collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
