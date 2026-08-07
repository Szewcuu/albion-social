import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PortalSubpageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  stats = [],
}) {
  return (
    <div className="space-y-4">
      <Link 
        href="/" 
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 font-medium transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Powrót do strony głównej
      </Link>

      <div className="modern-card p-6 sm:p-8 space-y-4 border-emerald-500/20 bg-gradient-to-r from-[#0d131a] via-[#090c10] to-[#090c10]">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          )}
          {eyebrow && (
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {eyebrow}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
          {title}
        </h1>

        {description && (
          <p className="text-gray-300 text-sm max-w-2xl leading-relaxed">
            {description}
          </p>
        )}

        {stats.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-xs">
                <span className="text-gray-400 font-medium block">{label}</span>
                <span className="text-emerald-400 font-bold text-sm mt-0.5 block">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
