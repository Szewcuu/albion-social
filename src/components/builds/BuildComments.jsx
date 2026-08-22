'use client'

import CustomSelect from '@/components/ui/CustomSelect'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Flag,
  MessageSquareText,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  Pencil,
  Reply,
  ArrowUpDown,
  Check,
} from 'lucide-react'

import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { supabase } from '@/lib/supabase'
import { portalAuth } from '@/lib/supabaseAuth'

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

function wasEdited(comment) {
  const createdAt = new Date(comment.createdAt).getTime()
  const updatedAt = new Date(comment.updatedAt).getTime()
  return Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt - createdAt > 1000
}

function buildCommentTree(comments, sortOrder) {
  const nodes = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [], replyTarget: null }]))
  const roots = []

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null
    if (parent) {
      node.replyTarget = parent
      parent.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  const prepareNode = (node, depth = 0) => {
    node.depth = depth
    node.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    let activityAt = new Date(node.createdAt).getTime() || 0
    for (const reply of node.replies) {
      activityAt = Math.max(activityAt, prepareNode(reply, depth + 1))
    }
    node.activityAt = activityAt
    return activityAt
  }

  roots.forEach((root) => prepareNode(root))
  roots.sort((a, b) => {
    if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
    if (sortOrder === 'active') return b.activityAt - a.activityAt
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
  return roots
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
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="panel relative w-full max-w-lg rounded-[24px] border border-[var(--border-warm)] p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={onClose} disabled={busy} aria-label="Zamknij" className="absolute right-4 top-4 rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)] transition hover:border-[var(--border-warm)] hover:text-[var(--text-bright)] disabled:opacity-50"><X className="h-4 w-4" /></button>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-warm)] bg-[var(--gold-glow)] text-[var(--gold)]"><Flag className="h-5 w-5" aria-hidden="true" /></span>
        <h2 id={titleId} style={{ fontFamily: 'var(--font-heading)' }} className="mt-4 pr-10 text-2xl font-bold text-[var(--text-bright)]">Zgłoś {target?.commentId ? 'komentarz' : 'build'}</h2>
        <p id={descriptionId} className="mt-2 text-xs leading-6 text-[var(--text-body)]">Zgłoszenie jest prywatne. Trafi do kolejki moderacji wraz z identyfikatorem treści i Twojego konta.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <CustomSelect
              label="Powód zgłoszenia"
              value={reason}
              onChange={(val) => setReason(val)}
              placeholder="Wybierz powód"
              options={[
                { value: '', label: 'Wybierz powód' },
                ...REPORT_OPTIONS.map(([value, label]) => ({ value, label }))
              ]}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${titleId}-details`} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Dodatkowy opis <span className="font-normal normal-case tracking-normal text-[var(--text-faded)]">(opcjonalnie)</span></label>
              <span className="font-mono text-[9px] text-[var(--text-faded)]">{details.length}/{REPORT_DETAILS_MAX_LENGTH}</span>
            </div>
            <textarea id={`${titleId}-details`} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={REPORT_DETAILS_MAX_LENGTH} rows={4} className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-stone)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faded)] focus:border-[var(--gold-dim)]" placeholder="Podaj kontekst, który pomoże moderatorowi..." />
          </div>
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost min-h-11 justify-center px-4 text-xs font-bold uppercase disabled:opacity-50">Anuluj</button>
            <button type="submit" disabled={busy || !reason} className="btn btn-primary min-h-11 justify-center px-4 text-xs font-bold uppercase disabled:opacity-45">{busy ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CommentThread({
  comment,
  busy,
  editingId,
  editContent,
  onEditContentChange,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onReply,
  onDelete,
  onReport,
}) {
  const isEditing = editingId === comment.id
  const canReply = comment.depth < 3
  const replyPreview = comment.replyTarget?.content?.replace(/\s+/g, ' ').trim()

  return (
    <li id={`comment-${comment.id}`} className={comment.depth ? 'mt-3 border-l border-[var(--border-warm)] pl-3 sm:pl-5' : ''}>
      <article className={`rounded-xl border bg-[var(--bg-stone)] p-4 sm:p-5 ${comment.depth ? 'border-[var(--border)]' : 'border-[var(--border-warm)]'}`}>
        {comment.replyTarget && (
          <a href={`#comment-${comment.replyTarget.id}`} className="mb-3 block rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[10px] leading-5 text-[var(--text-muted)] transition hover:border-[var(--gold-dim)] hover:text-[var(--text-body)]">
            <span className="font-bold text-[var(--gold)]">Odpowiedź do {comment.replyTarget.author}</span>
            <span className="ml-2">{replyPreview?.slice(0, 120)}{replyPreview?.length > 120 ? '…' : ''}</span>
          </a>
        )}

        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-warm)] bg-[var(--gold-glow)] font-bold text-[var(--gold-bright)]" style={{ fontFamily: 'var(--font-heading)' }} aria-hidden="true">
            {comment.author.slice(0, 1).toUpperCase() || <UserRound className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[var(--text-bright)]">
                  {comment.author}
                  {comment.own && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">(Twój wpis)</span>}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[9px] text-[var(--text-muted)]">
                  <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
                  {wasEdited(comment) && <span title={formatCommentDate(comment.updatedAt)}>(edytowano)</span>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onReply(comment)}
                  disabled={!canReply}
                  aria-label={`Odpowiedz użytkownikowi ${comment.author}`}
                  className="btn-icon disabled:cursor-not-allowed disabled:opacity-35"
                  title={canReply ? 'Odpowiedz' : 'Osiągnięto maksymalny poziom odpowiedzi'}
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>

                {comment.own ? (
                  <>
                    <button type="button" onClick={() => (isEditing ? onCancelEditing() : onStartEditing(comment))} aria-label="Edytuj komentarz" className="btn-icon text-[var(--gold)]" title="Edytuj wpis">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => onDelete(comment)} aria-label="Usuń komentarz" className="btn-icon text-[var(--blood)]" title="Usuń wpis">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => onReport({ commentId: comment.id })} aria-label="Zgłoś komentarz" className="btn-icon text-[var(--blood)]" title="Zgłoś komentarz">
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-3 space-y-2">
                <textarea value={editContent} onChange={(event) => onEditContentChange(event.target.value)} maxLength={COMMENT_MAX_LENGTH} rows={3} className="w-full resize-y rounded-lg border border-[var(--gold-dim)] bg-[var(--bg-panel)] p-2.5 text-xs text-[var(--text-primary)] outline-none" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={onCancelEditing} className="btn btn-ghost btn-sm">Anuluj</button>
                  <button type="button" onClick={() => onSaveEdit(comment.id)} disabled={busy === `edit-${comment.id}` || editContent.trim().length < 2} className="btn btn-primary btn-sm">
                    <Check className="h-3.5 w-3.5" /> Zapisz
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-[var(--text-body)]">{comment.content}</p>
            )}
          </div>
        </div>
      </article>

      {comment.replies.length > 0 && (
        <ol aria-label={`Odpowiedzi na komentarz użytkownika ${comment.author}`}>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              busy={busy}
              editingId={editingId}
              editContent={editContent}
              onEditContentChange={onEditContentChange}
              onStartEditing={onStartEditing}
              onCancelEditing={onCancelEditing}
              onSaveEdit={onSaveEdit}
              onReply={onReply}
              onDelete={onDelete}
              onReport={onReport}
            />
          ))}
        </ol>
      )}
    </li>
  )
}

export default function BuildComments({ buildId }) {
  const [user, setUser] = useState(null)
  const [comments, setComments] = useState([])
  const [count, setCount] = useState(0)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)

  const [sortOrder, setSortOrder] = useState('active')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const textareaRef = useRef(null)

  const loadComments = useCallback(async (session, { append = false, cursor = null } = {}) => {
    if (append) setLoadingMore(true)
    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined
    const cursorQuery = append && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    try {
      const payload = await readJson(await fetch(`/api/builds/${buildId}/comments${cursorQuery}`, { headers }))
      setComments((current) => {
        if (!append) return payload.comments || []
        const known = new Set(current.map((comment) => comment.id))
        return [...current, ...(payload.comments || []).filter((comment) => !known.has(comment.id))]
      })
      if (typeof payload.count === 'number') setCount(payload.count)
      setNextCursor(payload.pagination?.hasMore ? payload.pagination.nextCursor : null)
    } finally {
      if (append) setLoadingMore(false)
    }
  }, [buildId])

  const loadMoreComments = async () => {
    if (!nextCursor || loadingMore) return
    try {
      const { data: { session } } = await portalAuth.auth.getSession()
      await loadComments(session, { append: true, cursor: nextCursor })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    }
  }

  useEffect(() => {
    let active = true
    const start = async () => {
      const { data: { session } } = await portalAuth.auth.getSession()
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

    const { data: { subscription } } = portalAuth.auth.onAuthStateChange((_event, session) => {
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
        body: JSON.stringify({ content: trimmed, parentId: replyingTo?.id || null }),
      }))
      setComments((current) => [...current, payload.comment])
      setCount((current) => current + 1)
      setContent('')
      setReplyingTo(null)
      setNotice({ type: 'success', text: replyingTo ? 'Odpowiedź została opublikowana.' : 'Komentarz został opublikowany.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(null)
    }
  }

  const startEditing = (comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const saveEdit = async (commentId) => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed.length < 2 || busy) return
    setBusy(`edit-${commentId}`)
    setNotice(null)
    try {
      const payload = await readJson(await authenticatedFetch(`/api/builds/${buildId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      }))
      setComments((current) =>
        current.map((c) => (c.id === commentId ? { ...c, content: payload.comment.content, updatedAt: payload.comment.updatedAt } : c))
      )
      setEditingId(null)
      setEditContent('')
      setNotice({ type: 'success', text: 'Komentarz został zaktualizowany.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(null)
    }
  }

  const handleReply = (comment) => {
    if (!requireLogin()) return
    setReplyingTo(comment)
    textareaRef.current?.focus()
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const deleteComment = async () => {
    if (!deleteTarget || busy) return
    setBusy('delete')
    setNotice(null)
    try {
      await readJson(await authenticatedFetch(`/api/builds/${buildId}/comments/${deleteTarget.id}`, {
        method: 'DELETE',
      }))
      setComments((current) => current
        .filter((comment) => comment.id !== deleteTarget.id)
        .map((comment) => comment.parentId === deleteTarget.id ? { ...comment, parentId: null } : comment))
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

  const commentThreads = useMemo(() => buildCommentTree(comments, sortOrder), [comments, sortOrder])

  return (
    <section className="panel relative overflow-hidden p-5 sm:p-7 lg:p-8" aria-labelledby="build-comments-title">
      <div className="relative flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--gold)]">Głos społeczności</p>
          <h2 id="build-comments-title" style={{ fontFamily: 'var(--font-heading)' }} className="mt-1 flex items-center gap-3 text-2xl font-bold text-[var(--text-bright)]">
            <MessageSquareText className="h-6 w-6 text-[var(--gold)]" aria-hidden="true" /> Rada wojowników
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-[var(--text-body)]">Oceń doktrynę, dopowiedz wariant lub podziel się doświadczeniem z pola walki.</p>
        </div>
        <button type="button" onClick={() => openReport({ commentId: null })} className="btn btn-ghost btn-sm inline-flex items-center gap-2">
          <Flag className="h-4 w-4 text-[var(--blood)]" aria-hidden="true" /> Zgłoś build
        </button>
      </div>

      <div className="relative mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Komentarze</p>
              <span className="badge badge-gold font-mono">{count}</span>
            </div>

            <div className="flex min-w-[190px] items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
              <CustomSelect
                label="Sortowanie dyskusji"
                value={sortOrder}
                onChange={setSortOrder}
                options={[
                  { value: 'active', label: 'Ostatnio aktywne' },
                  { value: 'newest', label: 'Najnowsze wątki' },
                  { value: 'oldest', label: 'Najstarsze wątki' },
                ]}
                className="min-w-0"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="Ładowanie komentarzy"><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /></div>
          ) : comments.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="Jeszcze cisza przy stole" description="Rozpocznij dyskusję i zostaw pierwszą wskazówkę dla autora buildu." />
          ) : (
            <ol className="space-y-3">
              {commentThreads.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  busy={busy}
                  editingId={editingId}
                  editContent={editContent}
                  onEditContentChange={setEditContent}
                  onStartEditing={startEditing}
                  onCancelEditing={() => { setEditingId(null); setEditContent('') }}
                  onSaveEdit={saveEdit}
                  onReply={handleReply}
                  onDelete={setDeleteTarget}
                  onReport={openReport}
                />
              ))}
            </ol>
          )}
          {!loading && nextCursor && (
            <div className="flex justify-center pt-2">
              <button type="button" className="btn btn-ghost btn-sm" disabled={loadingMore} onClick={loadMoreComments}>
                {loadingMore ? 'Wczytywanie…' : 'Wczytaj starsze komentarze'}
              </button>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--bg-wood)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[var(--gold-bright)]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <h3 style={{ fontFamily: 'var(--font-heading)' }} className="text-xs font-bold uppercase tracking-wider">{replyingTo ? 'Napisz odpowiedź' : 'Dodaj komentarz'}</h3>
          </div>
          <form onSubmit={addComment} className="mt-4">
            {replyingTo && (
              <div className="mb-3 rounded-xl border border-[var(--gold-dim)] bg-[var(--gold-glow)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold-bright)]">Odpowiadasz: {replyingTo.author}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[var(--text-body)]">{replyingTo.content}</p>
                  </div>
                  <button type="button" onClick={() => setReplyingTo(null)} aria-label="Anuluj odpowiedź" className="btn-icon shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            <label htmlFor="build-comment" className="sr-only">Treść komentarza</label>
            <textarea
              ref={textareaRef}
              id="build-comment"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              rows={5}
              disabled={busy === 'comment'}
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-3 text-xs leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faded)] focus:border-[var(--gold-dim)] disabled:opacity-60"
              placeholder={user ? (replyingTo ? `Odpowiedz użytkownikowi ${replyingTo.author}…` : 'Dodaj wskazówkę lub opinię…') : 'Zaloguj się, aby dołączyć do dyskusji…'}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-mono text-[9px] text-[var(--text-faded)]">{content.length}/{COMMENT_MAX_LENGTH}</span>
              <span className="text-[9px] text-[var(--text-faded)]">Minimum 2 znaki</span>
            </div>
            <button
              type="submit"
              disabled={busy === 'comment' || content.trim().length < 2}
              className="btn btn-primary mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {busy === 'comment' ? 'Publikowanie…' : (replyingTo ? 'Opublikuj odpowiedź' : 'Opublikuj komentarz')}
            </button>
          </form>
          <p className="mt-4 border-t border-[var(--border)] pt-4 text-[10px] leading-5 text-[var(--text-faded)]">
            Komentarze są publiczne. Treści naruszające zasady można zgłosić moderatorom.
          </p>
        </aside>
      </div>

      {notice && <StatusNotice type={notice.type} className="relative mt-5">{notice.text}</StatusNotice>}

      <ConfirmDialog open={Boolean(deleteTarget)} title="Usunąć komentarz?" description="Ta operacja jest trwała. Odpowiedzi innych graczy pozostaną w dyskusji, a powiązane zgłoszenia zostaną usunięte." confirmLabel={busy === 'delete' ? 'Usuwanie…' : 'Usuń komentarz'} onConfirm={deleteComment} onOpenChange={(open) => !open && busy !== 'delete' && setDeleteTarget(null)} />
      <ReportDialog key={reportTarget?.commentId || (reportTarget ? 'build' : 'closed')} open={Boolean(reportTarget)} target={reportTarget} busy={busy === 'report'} onClose={() => busy !== 'report' && setReportTarget(null)} onSubmit={submitReport} />
    </section>
  )
}
