
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  ExternalLink,
  FileText,
  LoaderCircle,
  MessageSquare,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { API_BASE_URL, api, ApiError, getAccessToken } from '../services/api'
import Dropdown from '../components/ui/Dropdown'

function AnswerText({
  content,
  animate,
  onComplete,
}: {
  content: string
  animate: boolean
  onComplete: () => void
}) {
  const [visibleLength, setVisibleLength] = useState(animate ? 0 : content.length)

  useEffect(() => {
    if (!animate || visibleLength >= content.length) return

    const step = Math.max(1, Math.ceil(content.length / 100))
    const timer = window.setInterval(() => {
      setVisibleLength((current) => {
        const next = Math.min(current + step, content.length)
        if (next >= content.length) window.clearInterval(timer)
        return next
      })
    }, 24)

    return () => window.clearInterval(timer)
  }, [animate, content.length, visibleLength])

  useEffect(() => {
    if (animate && visibleLength >= content.length) onComplete()
  }, [animate, content.length, onComplete, visibleLength])

  const typing = animate && visibleLength < content.length

  return (
    <span>
      {content.slice(0, visibleLength)}
      {typing && <span aria-hidden="true" className="ml-0.5 animate-pulse text-primary">▍</span>}
    </span>
  )
}

interface Citation {
  chunk_id: string
  document_id: string
  document_name: string
  page_number: number
  quoted_text: string
  relevance_score: number
  citation_order: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model_name: string | null
  created_at: string
  citations: Citation[]
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ConversationDetail extends Conversation {
  messages: ChatMessage[]
}

interface CollectionOption {
  id: string
  name: string
}

interface AskResponse {
  conversation_id: string
  user_message: ChatMessage
  assistant_message: ChatMessage
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return typeof error.detail === 'string'
      ? error.detail
      : 'The request could not be completed.'
  }

  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

function formatDate(date: string): string {
  const value = new Date(date)

  if (Number.isNaN(value.getTime())) return ''

  const now = new Date()

  if (value.toDateString() === now.toDateString()) {
    return value.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return value.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  })
}

export default function Ask() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')

  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openingCitationId, setOpeningCitationId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function openCitation(citation: Citation) {
    setError('')
    const previewWindow = window.open('about:blank', '_blank')

    if (!previewWindow) {
      setError('Allow pop-ups for Recall to open a cited PDF page.')
      return
    }

    previewWindow.opener = null
    previewWindow.document.title = 'Opening cited PDF…'
    previewWindow.document.body.textContent = 'Loading the cited page…'
    setOpeningCitationId(citation.chunk_id)

    try {
      const token = getAccessToken()
      if (!token) throw new Error('Your session has expired. Please sign in again.')

      const response = await fetch(
        `${API_BASE_URL}/documents/${citation.document_id}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? 'The cited PDF is no longer available.'
            : 'Unable to open the cited PDF. Please try again.',
        )
      }

      const downloadedPdf = await response.blob()
      const pdf = downloadedPdf.type === 'application/pdf'
        ? downloadedPdf
        : new Blob([downloadedPdf], { type: 'application/pdf' })
      const pdfUrl = URL.createObjectURL(pdf)

      previewWindow.location.replace(`${pdfUrl}#page=${citation.page_number}`)

      const cleanup = window.setInterval(() => {
        if (previewWindow.closed) {
          window.clearInterval(cleanup)
          URL.revokeObjectURL(pdfUrl)
        }
      }, 15_000)
    } catch (err) {
      previewWindow.close()
      setError(getErrorMessage(err))
    } finally {
      setOpeningCitationId(null)
    }
  }

  useEffect(() => {
    const initialQuestion = searchParams.get('question')
    if (!initialQuestion) return
    setQuestion(initialQuestion)
    setSearchParams({}, { replace: true })
    inputRef.current?.focus()
  }, [searchParams, setSearchParams])

  // Load saved conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<Conversation[]>('/conversations')
      setConversations(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    let active = true

    api.get<CollectionOption[]>('/collections')
      .then((data) => {
        if (active) setCollections(data)
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err))
      })

    return () => {
      active = false
    }
  }, [])

  // Keep the latest message visible
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, loading])

  // Start a new conversation
  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setQuestion('')
    setError('')
    inputRef.current?.focus()
  }

  // Open an existing conversation
  const openConversation = async (id: string) => {
    if (loading || loadingConversationId) return

    setError('')
    setLoadingConversationId(id)

    try {
      const data = await api.get<ConversationDetail>(
        `/conversations/${id}`,
      )

      setConversationId(data.id)
      setMessages(data.messages)
      setQuestion('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingConversationId(null)
    }
  }

  // Delete a conversation
  const deleteConversation = async (
    event: MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    event.stopPropagation()

    if (loading || deletingId) return

    const confirmed = window.confirm(
      'Delete this conversation? This action cannot be undone.',
    )

    if (!confirmed) return

    setDeletingId(id)
    setError('')

    try {
      await api.delete(`/conversations/${id}`)

      setConversations((current) =>
        current.filter((conversation) => conversation.id !== id),
      )

      if (conversationId === id) {
        startNewConversation()
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  // Send a question to Recall
  const sendQuestion = async (value?: string) => {
    const submittedQuestion = (value ?? question).trim()

    if (!submittedQuestion || loading || loadingConversationId) return

    setQuestion('')
    setError('')
    setLoading(true)

    const temporaryMessage: ChatMessage = {
      id: `temporary-${Date.now()}`,
      role: 'user',
      content: submittedQuestion,
      model_name: null,
      created_at: new Date().toISOString(),
      citations: [],
    }

    setMessages((current) => [...current, temporaryMessage])

    try {
      const response = await api.post<AskResponse>(
        '/conversations/ask',
        {
          question: submittedQuestion,
          conversation_id: conversationId,
          collection_id: selectedCollectionId || null,
        },
      )

      setConversationId(response.conversation_id)
      setAnimatedMessageId(response.assistant_message.id)

      setMessages((current) => [
        ...current.filter(
          (message) => message.id !== temporaryMessage.id,
        ),
        response.user_message,
        response.assistant_message,
      ])

      await loadConversations()
    } catch (err) {
      setMessages((current) =>
        current.filter(
          (message) => message.id !== temporaryMessage.id,
        ),
      )

      setQuestion(submittedQuestion)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendQuestion()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendQuestion()
    }
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[26rem] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:h-[calc(100vh-7rem)] lg:min-h-150">

      {/* Conversation history sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-surface-secondary md:flex">

        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-semibold text-foreground">
              Conversations
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Your saved discussions
            </p>
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            disabled={loading || !!loadingConversationId}
            title="New conversation"
            className="rounded-lg border border-border p-2 text-foreground transition hover:bg-surface disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 space-y-1 overflow-y-auto p-3">

          {historyLoading && conversations.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoaderCircle
                className="animate-spin text-muted-foreground"
                size={20}
              />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <MessageSquare
                className="mx-auto mb-3 text-muted-foreground"
                size={24}
              />

              <p className="text-sm text-muted-foreground">
                No conversations yet.
              </p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const isActive = conversationId === conversation.id
              const isOpening = loadingConversationId === conversation.id
              const isDeleting = deletingId === conversation.id

              return (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-1 rounded-xl transition ${
                    isActive
                      ? 'bg-surface shadow-sm'
                      : 'hover:bg-surface'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void openConversation(conversation.id)}
                    disabled={
                      loading ||
                      !!loadingConversationId ||
                      isDeleting
                    }
                    className="flex min-w-0 flex-1 items-start gap-2 p-3 text-left disabled:opacity-50"
                  >
                    <MessageSquareText
                      size={17}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {conversation.title}
                      </span>

                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDate(conversation.updated_at)}
                      </span>
                    </span>

                    {isOpening && (
                      <LoaderCircle
                        size={15}
                        className="mt-1 shrink-0 animate-spin text-primary"
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    title="Delete conversation"
                    aria-label={`Delete ${conversation.title}`}
                    onClick={(event) =>
                      void deleteConversation(event, conversation.id)
                    }
                    disabled={loading || !!deletingId}
                    className="mr-2 rounded-md p-2 text-muted-foreground opacity-0 transition hover:bg-destructive-subtle hover:text-destructive group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <LoaderCircle
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Conversations are saved automatically.
          </p>
        </div>
      </aside>

      {/* Main chat area */}
      <section className="flex min-w-0 flex-1 flex-col">

        {/* Chat header */}
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-subtle p-2 text-primary">
              <Sparkles size={20} />
            </div>

            <div>
              <h1 className="font-semibold text-foreground">
                Ask Recall
              </h1>

              <p className="text-xs text-muted-foreground">
                Answers grounded in your documents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Search in</span>
            <Dropdown
              value={selectedCollectionId}
              onChange={setSelectedCollectionId}
              disabled={loading || !!loadingConversationId}
              label="Choose collection to search"
              className="w-40 sm:w-48"
              options={[
                { value: '', label: 'All documents' },
                ...collections.map((collection) => ({
                  value: collection.id,
                  label: collection.name,
                })),
              ]}
            />
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            disabled={loading || !!loadingConversationId}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-secondary disabled:opacity-50 md:hidden"
          >
            <Plus size={16} />
            New
          </button>
        </header>

        {/* Error message */}
        {error && (
          <div role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive-subtle p-3 text-sm text-destructive">
            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">

          {loadingConversationId ? (
            <div className="flex h-full items-center justify-center">
              <LoaderCircle
                className="animate-spin text-primary"
                size={28}
              />
            </div>
          ) : messages.length === 0 ? (

            /* Empty state */
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <div className="mb-5 rounded-2xl bg-primary-subtle p-4 text-primary">
                <BookOpen size={32} />
              </div>

              <h2 className="text-2xl font-semibold text-foreground">
                Your documents. Your answers.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                Ask questions about your uploaded PDFs. Recall searches
                your documents and provides answers with source references.
              </p>

              {/* Suggested questions */}
              <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-2">
                {[
                  'Who is the Dispatch Lead?',
                  'What is the current meal allowance?',
                  'Summarize the main policies.',
                  'What information is missing from these documents?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendQuestion(suggestion)}
                    disabled={loading}
                    className="rounded-xl border border-border bg-surface p-4 text-left text-sm text-foreground transition hover:border-primary/50 hover:bg-surface-secondary disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

          ) : (

            /* Conversation messages */
            <div className="mx-auto max-w-3xl space-y-8">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Message avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary-subtle text-primary'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <span className="text-xs font-semibold">
                        You
                      </span>
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </div>

                  <div
                    className={`min-w-0 max-w-[85%] ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}
                  >
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {message.role === 'user' ? 'You' : 'Recall'}
                    </p>

                    {/* Message content */}
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-surface-secondary text-foreground'
                      }`}
                    >
                      <AnswerText
                        content={message.content}
                        animate={message.id === animatedMessageId}
                        onComplete={() => setAnimatedMessageId((current) =>
                          current === message.id ? null : current,
                        )}
                      />
                    </div>

                    {/* Citations */}
                    {message.role === 'assistant' &&
                      message.id !== animatedMessageId &&
                      message.citations?.length > 0 && (
                        <div className="mt-4 space-y-2 text-left">
                          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <BookOpen size={14} />
                            SOURCES ({message.citations.length})
                          </p>

                          {message.citations.map((citation) => (
                            <button
                              type="button"
                              key={`${citation.chunk_id}-${citation.citation_order}`}
                              onClick={() => void openCitation(citation)}
                              disabled={openingCitationId === citation.chunk_id}
                              aria-label={`Open ${citation.document_name} at page ${citation.page_number}`}
                              title={`Open cited passage on page ${citation.page_number}`}
                              className="block w-full rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
                            >
                              <span className="flex items-center gap-2">
                                <FileText
                                  size={15}
                                  className="shrink-0 text-primary"
                                />

                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                  {citation.document_name}
                                </span>

                                <span className="flex shrink-0 items-center gap-1 rounded-md bg-primary-subtle px-2 py-1 text-xs font-medium text-primary">
                                  {openingCitationId === citation.chunk_id
                                    ? <LoaderCircle size={13} className="animate-spin" />
                                    : <ExternalLink size={13} />}
                                  Open page {citation.page_number}
                                </span>
                              </span>

                              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                                {citation.quoted_text}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </article>
              ))}

              {/* AI loading indicator */}
              {loading && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-subtle text-primary">
                    <Sparkles size={18} />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-secondary px-4 py-3 text-sm text-muted-foreground">
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                    Searching your documents...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Question input */}
        <div className="border-t border-border p-4 sm:px-8">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-border bg-surface-secondary p-2 focus-within:border-primary/60"
          >
            <textarea
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents..."
              rows={1}
              disabled={loading || !!loadingConversationId}
              className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={
                !question.trim() ||
                loading ||
                !!loadingConversationId
              }
              title="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <ArrowUp size={19} />
              )}
            </button>
          </form>

          <p className="mt-2 text-center text-xs text-muted-foreground">
            Recall answers using your uploaded documents. Always verify
            important information against the cited source.
          </p>
        </div>
      </section>
    </div>
  )
}
