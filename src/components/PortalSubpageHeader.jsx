import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

const toneClasses = {
  gold: 'text-[#f3ba2f] border-[#f3ba2f]/40 bg-[#f3ba2f]/10 shadow-[0_0_15px_rgba(243,186,47,0.2)]',
  violet: 'text-purple-300 border-purple-400/40 bg-purple-400/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]',
  sky: 'text-sky-300 border-sky-400/40 bg-sky-400/10 shadow-[0_0_15px_rgba(56,189,248,0.2)]',
  ember: 'text-orange-300 border-orange-400/40 bg-orange-400/10 shadow-[0_0_15px_rgba(251,146,60,0.2)]',
  crimson: 'text-rose-300 border-rose-400/40 bg-rose-400/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
}

export default function PortalSubpageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone = 'gold',
  stats = [],
  imagePosition = '70% center',
}) {
  return (
    <div className="space-y-4">
      <Link href="/" className="aopp-btn-glass inline-flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#f3ba2f] transition hover:scale-105">
        <ArrowLeft className="h-4 w-4" />
         Strona Główna / Powrót
      </Link>

      <header className="relative min-h-[300px] overflow-hidden rounded-3xl border border-[#f3ba2f]/35 shadow-[0_30px_90px_rgba(0,0,0,0.85)] bg-[#090508]">
        <Image
          src="/albion-social-hero.webp"
          alt="Albion Subpage Hero"
          fill
          priority
          sizes="(max-width: 1540px) 100vw, 1540px"
          className="object-cover opacity-40"
          style={{ objectPosition: imagePosition }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070306] via-[#070306]/90 to-transparent" />

        <div className="relative z-10 flex min-h-[300px] max-w-4xl flex-col justify-center p-7 sm:p-10 lg:p-12 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-2xl border p-3 ${toneClasses[tone] || toneClasses.gold}`}><Icon className="h-6 w-6" /></span>
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#f3ba2f]">{eyebrow}</p>
          </div>

          <h1 className="font-display max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">{description}</p>

          {stats.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2.5 font-mono">
              {stats.map(({ label, value }) => (
                <div key={label} className="bg-[#050204]/90 border border-[#f3ba2f]/25 px-4 py-2 rounded-2xl backdrop-blur-md">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-[#f3ba2f] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
    </div>
  )
}
