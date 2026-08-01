import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

const toneClasses = {
  gold: 'text-[#e5bb55] border-[#d8ad4a]/30 bg-[#d8ad4a]/10',
  violet: 'text-violet-300 border-violet-400/25 bg-violet-400/10',
  sky: 'text-sky-300 border-sky-400/25 bg-sky-400/10',
  ember: 'text-orange-200 border-orange-400/25 bg-orange-400/10',
  crimson: 'text-rose-300 border-rose-400/25 bg-rose-400/10',
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
    <>
      <Link href="/" className="group inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#caaa52] transition hover:text-[#f0cf77]">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Centrum dowodzenia
      </Link>

      <header className="relative min-h-[310px] overflow-hidden rounded-[28px] border border-[#d8ad4a]/20 shadow-[0_25px_80px_rgba(0,0,0,.42)]">
        <Image
          src="/albion-social-hero.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 1480px) 100vw, 1480px"
          className="object-cover"
          style={{ objectPosition: imagePosition }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,9,7,.97)_0%,rgba(7,9,7,.82)_48%,rgba(7,9,7,.27)_82%,rgba(7,9,7,.52)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(6,7,6,.93)_0%,transparent_55%)]" />

        <div className="relative z-10 flex min-h-[310px] max-w-4xl flex-col justify-center p-7 sm:p-10 lg:p-12">
          <div className="mb-5 flex items-center gap-3">
            <span className={`rounded-xl border p-2.5 ${toneClasses[tone] || toneClasses.gold}`}><Icon className="h-5 w-5" /></span>
            <p className="text-[10px] font-black uppercase tracking-[.26em] text-[#d9b45a]">{eyebrow}</p>
          </div>
          <h1 className="font-display max-w-3xl text-4xl font-black leading-[1.02] tracking-[-.025em] text-[#fffaf0] sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#c9c3b8] sm:text-base">{description}</p>

          {stats.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {stats.map(({ label, value }) => (
                <div key={label} className="min-w-32 rounded-xl border border-white/10 bg-black/35 px-4 py-2.5 backdrop-blur-md">
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#8f8b83]">{label}</p>
                  <p className="font-display mt-0.5 text-lg font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
    </>
  )
}
