import { FolderOpen } from 'lucide-react'

function Collections() {
  return (
    <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <FolderOpen size={28} className="text-zinc-600" strokeWidth={1.5} />
      </div>

      <h1 className="mt-5 text-xl font-semibold text-zinc-950">
        Organize your knowledge
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Collections will let you group related documents together.
      </p>
    </section>
  )
}

export default Collections
