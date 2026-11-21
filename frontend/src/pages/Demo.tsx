import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderOpen,
  Home,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'

type Page = 'overview' | 'documents' | 'ask' | 'collections'
type Source = { document: string; page: number; excerpt: string }
type Message = {
  role: 'user' | 'assistant'
  text: string
  source?: Source
}

const documents = [
  { name: 'Sample Staff Handbook.pdf', pages: 18, collection: 'People & Culture', date: 'Jun 14' },
  { name: 'Travel and Expenses Guide.pdf', pages: 12, collection: 'Operations', date: 'Jun 12' },
  { name: 'Information Security Overview.pdf', pages: 9, collection: 'Security', date: 'Jun 10' },
]

const annualLeaveSource: Source = {
  document: 'Sample Staff Handbook.pdf',
  page: 8,
  excerpt: 'Full-time employees receive 20 paid annual leave days per calendar year. Please submit leave requests at least two weeks in advance.',
}

const sickLeaveSource: Source = {
  document: 'Sample Staff Handbook.pdf',
  page: 9,
  excerpt: 'Employees may use up to 10 paid sick leave days per calendar year. Contact People Operations if you need an accommodation.',
}

const initialMessages: Message[] = [
  { role: 'user', text: 'How many annual leave days are provided?' },
  {
    role: 'assistant',
    text: 'The sample handbook provides full-time employees with 20 paid annual leave days per calendar year. It also asks employees to submit requests at least two weeks ahead.',
    source: annualLeaveSource,
  },
]

const navigation: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: 'Dashboard', icon: Home },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'ask', label: 'Ask Recall', icon: MessageSquareText },
  { id: 'collections', label: 'Collections', icon: FolderOpen },
]

function answerFor(question: string): Message {
  if (/annual|vacation|paid leave/i.test(question)) {
    return {
      role: 'assistant',
      text: 'The sample handbook provides full-time employees with 20 paid annual leave days per calendar year. It also asks employees to submit requests at least two weeks ahead.',
      source: annualLeaveSource,
    }
  }

  if (/sick/i.test(question)) {
    return {
      role: 'assistant',
      text: 'The sample handbook says employees may use up to 10 paid sick leave days per calendar year.',
      source: sickLeaveSource,
    }
  }

  if (/how far|how early|advance|notice|request/i.test(question)) {
    return {
      role: 'assistant',
      text: 'The sample handbook asks employees to submit annual leave requests at least two weeks in advance.',
      source: annualLeaveSource,
    }
  }

  return {
    role: 'assistant',
    text: 'I can only answer a few prepared questions in this public demo. Try asking about annual leave, sick leave, or how far ahead to request time off. The full Recall app searches your uploaded documents.',
  }
}

function Demo() {
  const [page, setPage] = useState<Page>('overview')
  const [messages, setMessages] = useState(initialMessages)
  const [question, setQuestion] = useState('')
  const [thinking, setThinking] = useState(false)
  const [source, setSource] = useState<Source | null>(null)

  const pageTitle = navigation.find((item) => item.id === page)?.label ?? 'Dashboard'

  function sendQuestion(prompt?: string) {
    const submitted = (prompt ?? question).trim()
    if (!submitted || thinking) return

    setQuestion('')
    setMessages((current) => [...current, { role: 'user', text: submitted }])
    setThinking(true)

    window.setTimeout(() => {
      setMessages((current) => [...current, answerFor(submitted)])
      setThinking(false)
    }, 550)
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    sendQuestion()
  }

  function startNewQuestion() {
    setMessages([])
    setQuestion('')
    setPage('ask')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="flex h-20 items-center gap-3 border-b border-border px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="font-semibold">Recall</p>
              <p className="text-xs text-muted-foreground">Your knowledge, connected.</p>
            </div>
          </div>

          <nav aria-label="Demo navigation" className="flex-1 space-y-1 px-3 py-6">
            <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Workspace</p>
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPage(id)}
                aria-current={page === id ? 'page' : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors ${page === id ? 'bg-primary-subtle text-primary' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'}`}
              >
                <Icon size={19} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </nav>

          <div className="border-t border-border p-4">
            <div className="flex items-start gap-2 rounded-xl bg-surface-secondary p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>Public demo uses fictional sample data. Nothing is uploaded or saved.</span>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-11 w-full max-w-6xl items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
                  <BookOpen size={19} />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold sm:text-xl">{pageTitle}</h1>
                  <p className="hidden text-sm text-muted-foreground sm:block">Explore a sample Recall workspace.</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href="https://github.com/arnavKharade/recall" target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition hover:bg-surface-hover hover:text-foreground">
                  <ExternalLink size={14} /><span className="hidden sm:inline">Source on GitHub</span><span className="sm:hidden">GitHub</span>
                </a>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3 py-1.5 text-xs font-medium text-primary">
                  <Sparkles size={14} /> Interactive demo
                </span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
            <div role="note" className="flex items-start gap-3 rounded-xl border border-info/20 bg-info-subtle px-4 py-3 text-sm text-foreground">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-info" />
              <p><strong>Sample workspace:</strong> questions use a small fictional handbook. Uploads, accounts, and saved conversations are disabled in this demo.</p>
            </div>

            {page === 'overview' && (
              <>
                <section className="flex flex-col justify-between gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:p-9">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1.5 text-xs font-semibold text-primary">
                      <Sparkles size={14} /> Answers with page references
                    </span>
                    <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">Ask your documents. See the evidence.</h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Recall searches documents and shows the passages behind each answer, so you can check where the information came from.</p>
                    <button type="button" onClick={() => setPage('ask')} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover">
                      Try Ask Recall <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="hidden h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-primary-subtle text-primary sm:flex">
                    <MessageSquareText size={48} strokeWidth={1.5} />
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-3" aria-label="Sample workspace overview">
                  {[
                    ['Documents', '3', FileText],
                    ['Collections', '3', FolderOpen],
                    ['Ready to search', '3', CheckCircle2],
                  ].map(([label, value, Icon]) => {
                    const StatIcon = Icon as typeof FileText
                    return (
                      <div key={label as string} className="rounded-2xl border border-border bg-surface p-5">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          {label as string}
                          <StatIcon size={17} className="text-primary" />
                        </div>
                        <p className="mt-3 text-2xl font-semibold">{value as string}</p>
                      </div>
                    )
                  })}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                      <div>
                        <h3 className="font-semibold">Recent documents</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Example files in this sample workspace</p>
                      </div>
                      <button type="button" onClick={() => setPage('documents')} className="text-sm font-medium text-primary hover:underline">View library</button>
                    </div>
                    <div className="divide-y divide-border">
                      {documents.map((document) => (
                        <DocumentRow key={document.name} document={document} />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <h3 className="font-semibold">Try a sample question</h3>
                    <p className="mt-1 text-sm text-muted-foreground">See how an answer connects to its source.</p>
                    <div className="mt-4 space-y-2">
                      {['How many annual leave days are provided?', 'How many sick leave days are available?'].map((suggestion) => (
                        <button key={suggestion} type="button" onClick={() => { setPage('ask'); setMessages([]); setQuestion(suggestion) }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-left text-sm transition hover:border-primary/40 hover:bg-surface-secondary">
                          <span>{suggestion}</span><ArrowRight size={15} className="shrink-0 text-primary" />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}

            {page === 'documents' && (
              <section className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="text-lg font-semibold">Sample document library</h2><p className="mt-1 text-sm text-muted-foreground">These fictional PDFs illustrate the library experience.</p></div>
                  <button type="button" disabled title="Uploads are disabled in the public demo" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground"><Plus size={16} /> Upload disabled in demo</button>
                </div>
                <div className="divide-y divide-border">
                  {documents.map((document) => <DocumentRow key={document.name} document={document} />)}
                </div>
              </section>
            )}

            {page === 'collections' && (
              <section>
                <div><h2 className="text-lg font-semibold">Collections</h2><p className="mt-1 text-sm text-muted-foreground">Documents are grouped by topic for focused questions.</p></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['People & Culture', 'Policies, leave, and team guidance', 1],
                    ['Operations', 'Travel and day-to-day procedures', 1],
                    ['Security', 'Information handling and safety', 1],
                  ].map(([name, description, count]) => (
                    <button key={name} type="button" onClick={() => setPage('documents')} className="rounded-2xl border border-border bg-surface p-5 text-left transition hover:border-primary/40">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary"><FolderOpen size={21} /></div>
                      <h3 className="mt-4 font-semibold">{name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                      <p className="mt-4 text-xs text-muted-foreground">{count} sample document</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {page === 'ask' && (
              <section className="flex h-[min(72vh,720px)] min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary"><Sparkles size={19} /></div>
                    <div><h2 className="font-semibold">Ask Recall</h2><p className="text-xs text-muted-foreground">Searching the fictional sample handbook</p></div>
                  </div>
                  <button type="button" onClick={startNewQuestion} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-sm transition hover:bg-surface-secondary"><Plus size={15} /><span className="hidden sm:inline">New question</span><span className="sm:hidden">New</span></button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8">
                  {messages.length === 0 ? (
                    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                      <div className="rounded-2xl bg-primary-subtle p-4 text-primary"><BookOpen size={30} /></div>
                      <h3 className="mt-4 text-xl font-semibold">Ask about the sample handbook</h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Try one of the prepared questions. The demo matches a few topics to sample passages.</p>
                      <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                        {['How many annual leave days are provided?', 'How many sick leave days are available?'].map((suggestion) => <button key={suggestion} type="button" onClick={() => sendQuestion(suggestion)} className="rounded-xl border border-border bg-background p-3 text-left text-sm transition hover:border-primary/40">{suggestion}</button>)}
                      </div>
                    </div>
                  ) : messages.map((message, index) => (
                    <article key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary-subtle text-primary'}`}>{message.role === 'user' ? 'You' : <Sparkles size={17} />}</div>
                      <div className={`min-w-0 max-w-[88%] ${message.role === 'user' ? 'text-right' : ''}`}>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{message.role === 'user' ? 'You' : 'Recall · Demo'}</p>
                        <div className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface-secondary'}`}>{message.text}</div>
                        {message.source && (
                          <button type="button" onClick={() => setSource(message.source ?? null)} className="mt-3 block w-full rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40">
                            <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><BookOpen size={14} /> SOURCE</span>
                            <span className="mt-2 flex items-center justify-between gap-2 text-sm font-medium"><span className="truncate">{message.source.document}</span><span className="shrink-0 rounded-md bg-primary-subtle px-2 py-1 text-xs text-primary">View page {message.source.page}</span></span>
                            <span className="mt-2 line-clamp-2 block text-xs leading-5 text-muted-foreground">{message.source.excerpt}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  ))}

                  {thinking && <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles size={16} className="text-primary" /> Checking the sample passages…</div>}
                </div>

                <div className="border-t border-border p-4 sm:px-6">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {['Annual leave days?', 'Sick leave policy?', 'How much notice?'].map((suggestion) => <button key={suggestion} type="button" onClick={() => sendQuestion(suggestion)} disabled={thinking} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50">{suggestion}</button>)}
                  </div>
                  <form onSubmit={submitQuestion} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-surface-secondary p-2 focus-within:border-primary/50">
                    <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the sample documents…" aria-label="Ask a question about the sample documents" disabled={thinking} className="min-h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground" />
                    <button type="submit" disabled={!question.trim() || thinking} aria-label="Send question" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40">{thinking ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowUp size={19} />}</button>
                  </form>
                  <p className="mt-2 text-center text-xs text-muted-foreground">Sample answers only · no documents leave your browser because this demo does not upload files.</p>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      <nav aria-label="Demo mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setPage(id)} aria-current={page === id ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium ${page === id ? 'text-primary' : 'text-muted-foreground'}`}><Icon size={19} /><span className="max-w-full truncate">{label}</span></button>)}
      </nav>

      {source && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSource(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="demo-source-title" className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Sample source · Page {source.page}</p><h2 id="demo-source-title" className="mt-1 font-semibold">{source.document}</h2></div>
              <button type="button" onClick={() => setSource(null)} aria-label="Close source passage" className="rounded-lg p-2 text-muted-foreground hover:bg-surface-hover"><X size={18} /></button>
            </div>
            <blockquote className="mt-5 rounded-xl border-l-4 border-primary bg-surface-secondary p-4 text-sm leading-7 text-foreground">“{source.excerpt}”</blockquote>
            <p className="mt-4 text-xs text-muted-foreground">This citation is part of the fictional portfolio demo corpus.</p>
          </section>
        </div>
      )}
    </div>
  )
}

function DocumentRow({ document }: { document: (typeof documents)[number] }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
      <div className="shrink-0 rounded-xl bg-primary-subtle p-3 text-primary"><FileText size={20} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={document.name}>{document.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{document.pages} pages · {document.collection} · {document.date}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 size={13} /> Ready</span>
    </div>
  )
}

export default Demo
