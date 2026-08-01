import { AlertTriangle, Check, Info } from 'lucide-react'

export function SkeletonBlock({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl border border-white/8 bg-white/[.035] ${className}`} />
}

export function EmptyState({ icon: Icon = Info, title, description, compact = false, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center ${compact ? 'px-4 py-6' : 'px-5 py-9'} ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/[.025] text-[#77736c]"><Icon className="h-4 w-4" /></span>
      {title && <p className="mt-3 text-xs font-bold text-[#b8b1a7]">{title}</p>}
      {description && <p className="mt-1 max-w-md text-[10px] leading-5 text-[#77736c]">{description}</p>}
    </div>
  )
}

export function StatusNotice({ type = 'info', children, className = '' }) {
  const config = {
    success: { Icon: Check, classes: 'border-emerald-400/25 bg-emerald-400/8 text-emerald-200' },
    error: { Icon: AlertTriangle, classes: 'border-rose-400/25 bg-rose-400/8 text-rose-200' },
    info: { Icon: Info, classes: 'border-sky-400/20 bg-sky-400/7 text-sky-100' },
  }[type] || { Icon: Info, classes: 'border-white/10 bg-white/[.03] text-[#b8b1a7]' }
  const NoticeIcon = config.Icon

  return (
    <div role={type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs leading-5 ${config.classes} ${className}`}>
      <NoticeIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
