import Link from 'next/link'
import { AlertTriangle, Check, Info, LoaderCircle, RefreshCw } from 'lucide-react'

export function SkeletonBlock({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl border border-white/8 bg-white/[.035] ${className}`} />
}

export function LoadingState({ label = 'Ładowanie danych…', description = '', compact = false, className = '' }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={`flex flex-col items-center justify-center rounded-xl border border-white/8 bg-white/[.025] text-center ${compact ? 'px-4 py-6' : 'min-h-48 px-5 py-9'} ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[.045] text-amber-300"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /></span>
      <p className="mt-3 text-xs font-bold text-[var(--text-primary)]">{label}</p>
      {description && <p className="mt-1 max-w-md text-[10px] leading-5 text-[var(--text-muted)]">{description}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon = Info, title, description, action = null, actionLabel = '', actionHref = '', compact = false, className = '' }) {
  const resolvedAction = action || (actionLabel && actionHref ? <Link href={actionHref} className="btn btn-ghost btn-sm inline-flex">{actionLabel}</Link> : null)
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center ${compact ? 'px-4 py-6' : 'px-5 py-9'} ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/[.025] text-[#918b82]"><Icon className="h-4 w-4" /></span>
      {title && <h2 className="mt-3 text-sm font-bold text-[#b8b1a7]">{title}</h2>}
      {description && <p className="mt-1 max-w-md text-[10px] leading-5 text-[#918b82]">{description}</p>}
      {resolvedAction && <div className="mt-4">{resolvedAction}</div>}
    </div>
  )
}

export function ErrorState({ icon: Icon = AlertTriangle, title = 'Nie udało się wczytać danych', description, onRetry, retryLabel = 'Spróbuj ponownie', action = null, compact = false, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/[.035] text-center ${compact ? 'px-4 py-6' : 'px-5 py-9'} ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/[.07] text-rose-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <h2 className="mt-3 text-sm font-bold text-[var(--text-primary)]">{title}</h2>
      {description && <p className="mt-1 max-w-lg text-[10px] leading-5 text-[var(--text-secondary)]">{description}</p>}
      {onRetry && <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm mt-4 inline-flex"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> {retryLabel}</button>}
      {action && <div className={onRetry ? 'mt-2' : 'mt-4'}>{action}</div>}
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
