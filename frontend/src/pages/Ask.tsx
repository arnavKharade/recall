import { MessageSquareText } from 'lucide-react'

function Ask() {
  return (
    <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <MessageSquareText
          size={28}
          className="text-zinc-600"
          strokeWidth={1.5}
        />
      </div>

      <h1 className="mt-5 text-xl font-semibold text-zinc-950">
        Ask your documents
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Soon, you'll be able to ask questions about your PDFs and receive
        evidence-based answers with page-level citations.
      </p>
    </section>
  )
}

export default Ask
