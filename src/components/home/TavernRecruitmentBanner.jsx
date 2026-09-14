'use client'

import Link from 'next/link'
import { ArrowRight, MessageSquare, ShieldCheck, Sparkles, Users } from 'lucide-react'

export default function TavernRecruitmentBanner() {
  return (
    <Link
      href="/rekrutacja"
      className="group relative block overflow-hidden rounded-2xl border border-[#bd914050] bg-gradient-to-br from-[#382316] via-[#1e130c] to-[#120b08] p-4 sm:p-5 lg:p-4 shadow-lg transition-all duration-300 hover:border-[#dbb36e] hover:shadow-[0_0_24px_rgba(205,164,65,0.12)] focus-visible:outline-2 focus-visible:outline-amber-400"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/10 blur-xl transition-transform group-hover:scale-125" />

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-amber-300">
          <Sparkles className="h-3 w-3 text-amber-400" /> Sztab Werbunkowy
        </span>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">
          ● Nabór Otwarty
        </span>
      </div>

      <h2 className="font-display mt-2 text-lg lg:text-xl font-bold text-[#fff2d8] group-hover:text-amber-200 transition-colors">
        Zostań Moderatorem
      </h2>

      <p className="mt-1.5 text-xs leading-relaxed text-[#c4b193]">
        Poszukujemy ochotników do moderowania serwera <strong>Discord</strong> oraz grupy <strong>Facebook</strong>. Zadbaj z nami o polską społeczność Albionu!
      </p>

      <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase text-[#e2cfb2]">
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1">
          <MessageSquare className="h-3 w-3 text-sky-400" /> Discord
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1">
          <Users className="h-3 w-3 text-blue-400" /> Facebook
        </span>
      </div>

      <div className="mt-3.5 flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 group-hover:text-amber-200 border-t border-white/5 pt-2.5">
        <span>Złóż podanie do ekipy</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  )
}
