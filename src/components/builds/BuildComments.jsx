'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  Flag,
  MessageSquareText,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { supabase } from '@/lib/supabase'

const COMMENT_MAX_LENGTH = 1000
const REPORT_DETAILS_MAX_LENGTH = 500
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const REPORT_OPTIONS = [
  ['spam', 'Spam lub reklama'],
  ['harassment', 'Nękanie lub obrażanie'],
  ['inappropriate', 'Nieodpowiednia treść'],
  ['misinformation', 'Celowo wprowadzające w błąd'],
  ['other', 'Inny powód'],
]

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nie udało się wykonać operacji.')
  return payload
}

function formatCommentDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function ReportDialog({ open, target, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const selectRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const frame = window.requestAnimationFrame(() => selectRef.current?.focus())

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [busy, onClose, open])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    if (reason) onSubmit({ reason, details: details.trim(), commentId: target?.commentId || null })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Zamknij formularz zgłoszenia" className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="aopp-panel relative w-full max-w-lg rounded-[24px] border border-orange-200/15 p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={onClose} disabled={busy} aria-label="Zamknij" className="absolute right-4 top-4 rounded-lg border border-white/8 p-2 text-[#918b82] transition hover:border-white/15 hover:text-[#eee7d9] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5bb55]"><X className="h-4 w-4" /></button>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-300/25 bg-orange-300/8 text-orange-200"><Flag className="h-5 w-5" aria-hidden="true" /></span>
        <h2 id={titleId} className="font-display mt-4 pr-10 text-2xl font-black text-[#fff8e8]">Zgłoś {target?.commentId ? 'komentarz' : 'build'}</h2>
        <p id={descriptionId} className="mt-2 text-xs leading-6 text-[#9f9a91]">Zgłoszenie jest prywatne. Trafi do kolejki moderacji wraz z identyfikatorem treści i Twojego konta.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor={`${titleId}-reason`} className="text-[10px] font-black uppercase tracking-[.14em] text-[#c9c3b8]">Powód zgłoszenia</label>
            <select ref={selectRef} id={`${titleId}-reason`} required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#120b08] px-3 text-sm text-[#eee7d9] outline-none transition focus:border-orange-300/45 focus:ring-2 focus:ring-orange-300/15">
              <option value="">Wybierz powód</option>
              {REPORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${titleId}-details`} className="text-[10px] font-black uppercase tracking-[.14em] text-[#c9c3b8]">Dodatkowy opis <span className="font-normal normal-case tracking-normal text-[#777168]">(opcjonalnie)</span></label>
              <span className="font-mono text-[9px] text-[#777168]">{details.length}/{REPORT_DETAILS_MAX_LENGTH}</span>
            </div>
            <textarea id={`${titleId}-details`} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={REPORT_DETAILS_MAX_LENGTH} rows={4} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-[#eee7d9] outline-none transition placeholder:text-[#625d56] focus:border-orange-300/45 focus:ring-2 focus:ring-orange-300/15" placeholder="Podaj kontekst, który pomoże moderatorowi..." />
          </div>
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <button type="button" onClick={onClose} disabled={busy} className="aopp-ghost-button min-h-11 justify-center px-4 text-[10px] font-black uppercase tracking-[.12em] disabled:opacity-50">Anuluj</button>
            <button type="submit" disabled={busy || !reason} className="min-h-11 rounded-xl border border-orange-300/30 bg-orange-300/10 px-4 text-[10px] font-black uppercase tracking-[.12em] text-orange-100 transition hover:bg-orange-300/16 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300">{busy ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BuildComments({ buildId }) {
  const [user, setUser] = useState(null)
  const [comments, setComments] = useState([])
  const [count, setCount] = useState(0)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)

  const loadComments = useCallback(async (session) => {
    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined
    const payload = await readJson(await fetch(`/api/builds/${buildId}/comments`, { headers }))
    setComments(payload.comments)
    setCount(payload.count)
  }, [buildId])

  useEffect(() => {
    let active = true
    const start = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      setUser(session?.user || null)
      await loadComments(session)
      if (active) setLoading(false)
    }

    start().catch((error) => {
      if (active) {
        setNotice({ type: 'error', text: error.message })
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user || null)
      loadComments(session).catch(() => setNotice({ type: 'error', text: 'Nie udało się odświeżyć komentarzy.' }))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadComments])

  const requireLogin = () => {
    if (user) return true
    setNotice({ type: 'info', text: 'Zaloguj się przez Discord, aby komentować lub zgłaszać treści.' })
    return false
  }

  const addComment = async (event) => {
    event.preventDefault()
    const trimmed = content.trim()
    if (!requireLogin() || busy || trimmed.length < 2) return
    setBusy('comment')
    setNotice(null)
    try {
      const payload = await readJson(await authenticatedFetch(`/api/builds/${buildId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      }))
      setComments((current) => [...current, payload.comment])
      setCount((current) => current + 1)
      setContent('')
      setNotice({ type: 'success', text: 'Komentarz został opublikowany.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(null)
    }
  }

  const deleteComment = async () => {
    if (!deleteTarget || busy) return
    setBusy('delete')
    setNotice(null)
    try {
      await readJson(await authenticatedFetch(`/api/builds/${buildId}/comments/${deleteTarget.id}`, {
        method: 'DELETE',
      }))
      setComments((current) => current.filter((comment) => comment.id !== deleteTarget.id))
      setCount((current) => Math.max(0, current - 1))
      setDeleteTarget(null)
      setNotice({ type: 'success', text: 'Komentarz został usunięty.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(null)
    }
  }

  const openReport = (target) => {
    if (requireLogin()) setReportTarget(target)
  }

  const submitReport = async (report) => {
    if (busy) return
    setBusy('report')
    setNotice(null)
    try {
      await readJson(await authenticatedFetch(`/api/builds/${buildId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      }))
      setReportTarget(null)
      setNotice({ type: 'success', text: 'Zgłoszenie trafiło do kolejki moderacji. Dziękujemy.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="aopp-panel relative overflow-hidden p-5 sm:p-7 lg:p-8" aria-labelledby="build-comments-title">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-orange-400/7 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-200/55">Głos społeczności</p>
          <h2 id="build-comments-title" className="font-display mt-2 flex items-center gap-3 text-3xl font-black text-[#fff8e8]"><MessageSquareText className="h-6 w-6 text-orange-200" aria-hidden="true" /> Rada wojowników</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-[#9f9a91]">Oceń doktrynę, dopowiedz wariant lub podziel się doświadczeniem z pola walki.</p>
        </div>
        <button type="button" onClick={() => openReport({ commentId: null })} className="aopp-ghost-button inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 text-[10px] font-black uppercase tracking-[.12em]"><Flag className="h-4 w-4" aria-hidden="true" /> Zgłoś build</button>
      </div>

      <div className="relative mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#c9c3b8]">Komentarze</p>
            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1 font-mono text-[9px] text-[#918b82]">{count}</span>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="Ładowanie komentarzy"><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /></div>
          ) : comments.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="Jeszcze cisza przy stole" description="Rozpocznij dyskusję i zostaw pierwszą wskazówkę dla autora buildu." />
          ) : (
            <ol className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-2xl border border-white/8 bg-black/20 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-200/15 bg-orange-200/[.06] font-display text-sm font-black text-orange-100" aria-hidden="true">{comment.author.slice(0, 1).toUpperCase() || <UserRound className="h-4 w-4" />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-[#eee7d9]">{comment.author}{comment.own && <span className="ml-2 text-[9px] uppercase tracking-[.12em] text-orange-200/60">Twój wpis</span>}</p>
                          <time dateTime={comment.createdAt} className="mt-1 block font-mono text-[9px] text-[#777168]">{formatCommentDate(comment.createdAt)}</time>
                        </div>
                        <div className="flex gap-1">
                          {comment.own ? (
                            <button type="button" onClick={() => setDeleteTarget(comment)} aria-label={`Usuń komentarz użytkownika ${comment.author}`} className="rounded-lg border border-transparent p-2 text-[#777168] transition hover:border-rose-300/20 hover:bg-rose-300/7 hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                          ) : (
                            <button type="button" onClick={() => openReport({ commentId: comment.id })} aria-label={`Zgłoś komentarz użytkownika ${comment.author}`} className="rounded-lg border border-transparent p-2 text-[#777168] transition hover:border-orange-300/20 hover:bg-orange-300/7 hover:text-orange-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"><Flag className="h-4 w-4" aria-hidden="true" /></button>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#c9c3b8]">{comment.content}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-orange-200/12 bg-[linear-gradient(145deg,rgba(103,45,18,.13),rgba(0,0,0,.18))] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-orange-100"><ShieldCheck className="h-4 w-4" aria-hidden="true" /><h3 className="text-[10px] font-black uppercase tracking-[.14em]">Dodaj komentarz</h3></div>
          <form onSubmit={addComment} className="mt-4">
            <label htmlFor="build-comment" className="sr-only">Treść komentarza</label>
            <textarea id="build-comment" value={content} onChange={(event) => setContent(event.target.value)} maxLength={COMMENT_MAX_LENGTH} rows={6} disabled={busy === 'comment'} className="w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-[#eee7d9] outline-none transition placeholder:text-[#625d56] focus:border-orange-300/45 focus:ring-2 focus:ring-orange-300/15 disabled:opacity-60" placeholder={user ? 'Dodaj wskazówkę lub opinię…' : 'Zaloguj się, aby dołączyć do dyskusji…'} />
            <div className="mt-2 flex items-center justify-between gap-3"><span className="font-mono text-[9px] text-[#777168]">{content.length}/{COMMENT_MAX_LENGTH}</span><span className="text-[9px] text-[#777168]">Minimum 2 znaki</span></div>
            <button type="submit" disabled={busy === 'comment' || content.trim().length < 2} className="aopp-primary-button mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[10px] font-black uppercase tracking-[.12em] disabled:cursor-not-allowed disabled:opacity-45"><Send className="h-4 w-4" aria-hidden="true" /> {busy === 'comment' ? 'Publikowanie…' : 'Opublikuj'}</button>
          </form>
          <p className="mt-4 border-t border-white/8 pt-4 text-[10px] leading-5 text-[#777168]">Komentarze są publiczne. Nie publikuj danych prywatnych; treści naruszające zasady można zgłosić moderatorom.</p>
        </aside>
      </div>

      {notice && <StatusNotice type={notice.type} className="relative mt-5">{notice.text}</StatusNotice>}

      <ConfirmDialog open={Boolean(deleteTarget)} title="Usunąć komentarz?" description="Ta operacja jest trwała. Wraz z komentarzem znikną powiązane z nim zgłoszenia." confirmLabel={busy === 'delete' ? 'Usuwanie…' : 'Usuń komentarz'} onConfirm={deleteComment} onOpenChange={(open) => !open && busy !== 'delete' && setDeleteTarget(null)} />
      <ReportDialog key={reportTarget?.commentId || (reportTarget ? 'build' : 'closed')} open={Boolean(reportTarget)} target={reportTarget} busy={busy === 'report'} onClose={() => busy !== 'report' && setReportTarget(null)} onSubmit={submitReport} />
    </section>
  )
}
