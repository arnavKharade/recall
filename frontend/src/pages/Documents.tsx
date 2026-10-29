import { Files } from 'lucide-react'

function Documents() {
  return (
    <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <Files size={28} className="text-zinc-600" strokeWidth={1.5} />
      </div>

      <h1 className="mt-5 text-xl font-semibold text-zinc-950">
        Your document library
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Your uploaded PDFs will live here. We'll build document uploads,
        processing status, filtering, and search next.
      </p>
    </section>
  )
}

export default Documents
