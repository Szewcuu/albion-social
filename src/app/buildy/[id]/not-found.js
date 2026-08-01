import Link from 'next/link'
import { Anvil, ArrowLeft } from 'lucide-react'

export default function BuildNotFound() {
  return (
    <main className="aopp-shell flex min-h-screen items-center justify-center p-4 text-[#d5d0c6]">
      <div className="aopp-world-bg" />
      <div className="aopp-grain" />
      <section className="aopp-panel relative z-10 w-full max-w-xl p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/25 bg-orange-300/8 text-orange-200">
          <Anvil className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[.22em] text-orange-200/60">Zbrojownia nie odnalazła zapisu</p>
        <h1 className="font-display mt-2 text-3xl font-black text-[#fff8e8]">Ten build nie istnieje</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#aaa49a]">Link mógł wygasnąć, build został usunięty albo jego identyfikator jest nieprawidłowy.</p>
        <Link href="/buildy" className="aopp-primary-button mt-7 inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-[.12em]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Wróć do buildów
        </Link>
      </section>
    </main>
  )
}
