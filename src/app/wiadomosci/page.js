'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Lock as Archive, ArrowLeft, HandCoins, MessageSquareText as Inbox, Lock, MessageSquareText, RefreshCw, Search, Send, ShieldCheck, ShoppingBag } from 'lucide-react'

import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { EmptyState, LoadingState, StatusNotice } from '@/components/ui/FeedbackState'

const formatSilver = (value) => `${Number(value || 0).toLocaleString('pl-PL')} Silver`
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : ''

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Operacja nie powiodła się.')
  return payload
}

export default function TradeInboxPage() {
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [threadFilter, setThreadFilter] = useState('all')
  const [threadSearch, setThreadSearch] = useState('')
  const endRef = useRef(null)
  const deferredThreadSearch = useDeferredValue(threadSearch)

  const visibleConversations = useMemo(() => {
    const search = deferredThreadSearch.trim().toLocaleLowerCase('pl')
    return conversations.filter((conversation) => {
      const matchesStatus = threadFilter === 'all' || conversation.status === threadFilter
      const matchesSearch = !search || `${conversation.counterpartName} ${conversation.offerTitle} ${conversation.lastMessage}`.toLocaleLowerCase('pl').includes(search)
      return matchesStatus && matchesSearch
    })
  }, [conversations, deferredThreadSearch, threadFilter])

  const loadInbox = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    try {
      const payload = await readJson(await authenticatedFetch('/api/market/conversations'))
      setConversations(payload.conversations || [])
      setError('')
      return payload.conversations || []
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  const loadConversation = useCallback(async (conversationId, { quiet = false } = {}) => {
    if (!conversationId) return
    if (!quiet) setDetailLoading(true)
    try {
      const payload = await readJson(await authenticatedFetch(`/api/market/conversations/${conversationId}`))
      setDetail(payload)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      if (!quiet) setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const start = async () => {
      const rows = await loadInbox()
      if (!active) return
      const requested = new URLSearchParams(window.location.search).get('conversation')
      const initial = rows.some((row) => row.id === requested) ? requested : rows[0]?.id
      if (initial) setSelectedId(initial)
    }
    start()
    return () => { active = false }
  }, [loadInbox])

  useEffect(() => {
    if (!selectedId) return
    window.history.replaceState(null, '', `/wiadomosci?conversation=${selectedId}`)
    const timer = window.setTimeout(() => loadConversation(selectedId), 0)
    return () => window.clearTimeout(timer)
  }, [loadConversation, selectedId])

  useEffect(() => {
    const interval = window.setInterval(async () => {
      await loadInbox({ quiet: true })
      if (selectedId) await loadConversation(selectedId, { quiet: true })
    }, 20_000)
    return () => window.clearInterval(interval)
  }, [loadConversation, loadInbox, selectedId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [detail?.messages?.length])

  const selectConversation = (id) => {
    setDetail(null)
    setSelectedId(id)
    setConversations((current) => current.map((row) => row.id === id ? { ...row, unreadCount: 0 } : row))
  }

  const sendMessage = async (event) => {
    event?.preventDefault()
    const cleanMessage = message.trim()
    if (!selectedId || !cleanMessage || busy) return
    setBusy(true)
    try {
      await readJson(await authenticatedFetch(`/api/market/conversations/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanMessage }),
      }))
      setMessage('')
      await Promise.all([loadConversation(selectedId, { quiet: true }), loadInbox({ quiet: true })])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleStatus = async () => {
    if (!detail?.conversation || busy) return
    const status = detail.conversation.status === 'open' ? 'closed' : 'open'
    setBusy(true)
    try {
      await readJson(await authenticatedFetch(`/api/market/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }))
      await Promise.all([loadConversation(selectedId, { quiet: true }), loadInbox({ quiet: true })])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Skrzynka handlowa</h1>
        <p>Prywatne negocjacje ofert rynku P2P — bez publikowania Discorda, e-maila ani danych kontaktowych.</p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-100">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Tylko uczestnicy rozmowy mogą zobaczyć jej treść.</span>
          <span className="flex items-center gap-2 text-[var(--text-secondary)]"><Lock className="h-3.5 w-3.5" /> Finalizuj wymianę w grze i nigdy nie podawaj hasła.</span>
        </div>

        {error && <StatusNotice type="error" className="mb-4">{error}</StatusNotice>}

        <section className="panel grid min-h-[650px] overflow-hidden p-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className={`${selectedId ? 'hidden lg:flex' : 'flex'} min-h-[650px] flex-col border-r border-white/8 bg-black/15`}>
            <div className="space-y-3 border-b border-white/8 p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-sky-300">Wątki transakcyjne</p><h2 className="font-display text-lg font-black text-white">Rozmowy</h2></div>
                <button type="button" onClick={() => loadInbox()} className="btn-icon" aria-label="Odśwież skrzynkę"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <input value={threadSearch} onChange={(event) => setThreadSearch(event.target.value)} aria-label="Szukaj rozmowy handlowej" placeholder="Gracz, oferta lub wiadomość…" className="input-with-icon w-full rounded-xl py-2 pr-3 text-xs" />
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-black/20 p-1" role="group" aria-label="Stan rozmów">
                {[['all', 'Wszystkie'], ['open', 'Aktywne'], ['closed', 'Zamknięte']].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setThreadFilter(value)} aria-pressed={threadFilter === value} className={`min-h-9 rounded-lg px-1 text-[9px] font-black uppercase transition ${threadFilter === value ? 'bg-amber-400 text-black' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <LoadingState label="Pobieranie rozmów…" compact className="m-2" />
              ) : conversations.length === 0 ? (
                <EmptyState icon={Inbox} title="Skrzynka jest pusta" description="Otwórz wybraną ofertę na rynku i kliknij „Napisz do sprzedawcy”." action={<Link href="/rynek" className="btn btn-primary btn-sm"><ShoppingBag className="h-4 w-4" /> Przejdź na rynek</Link>} className="m-2 min-h-72" />
              ) : visibleConversations.length === 0 ? (
                <EmptyState icon={Search} title="Brak pasujących rozmów" description="Zmień wyszukiwaną frazę lub stan rozmowy." action={<button type="button" onClick={() => { setThreadFilter('all'); setThreadSearch('') }} className="btn btn-ghost btn-sm">Wyczyść filtry</button>} compact className="m-2" />
              ) : visibleConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                  className={`mb-2 w-full rounded-xl border p-3 text-left transition ${selectedId === conversation.id ? 'border-amber-400/45 bg-amber-400/10' : 'border-white/8 bg-white/[.025] hover:border-white/20 hover:bg-white/[.05]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><strong className="block truncate text-sm text-white">{conversation.counterpartName}</strong><span className="block truncate text-[10px] uppercase tracking-wide text-sky-300">{conversation.offerTitle}</span></div>
                    {conversation.unreadCount > 0 && <span className="min-w-5 rounded-full bg-amber-400 px-1.5 py-0.5 text-center text-[10px] font-black text-black">{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</span>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{conversation.lastMessage}</p>
                  <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-wide text-[var(--text-muted)]"><span>{conversation.status === 'open' ? 'Aktywna' : 'Zamknięta'}</span><time>{formatDate(conversation.lastMessageAt)}</time></div>
                </button>
              ))}
            </div>
          </aside>

          <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} min-h-[650px] min-w-0 flex-col`}>
            {!selectedId ? (
              <div className="flex h-full flex-1 flex-col items-center justify-center text-center"><MessageSquareText className="mb-4 h-12 w-12 text-amber-300/40" /><h2 className="font-display text-xl font-bold text-white">Wybierz rozmowę</h2><p className="mt-2 text-xs text-[var(--text-secondary)]">Historia negocjacji pojawi się tutaj.</p></div>
            ) : detailLoading || !detail ? (
              <div className="flex h-full flex-1 items-center justify-center text-xs text-[var(--text-secondary)]"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Otwieranie rozmowy…</div>
            ) : (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 p-4 sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button type="button" onClick={() => { setDetail(null); setSelectedId(null) }} className="btn-icon lg:hidden" aria-label="Wróć do rozmów"><ArrowLeft className="h-4 w-4" /></button>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300"><HandCoins className="h-5 w-5" /></div>
                    <div className="min-w-0"><h2 className="truncate font-display text-lg font-black text-white">{detail.conversation.counterpartName}</h2><p className="truncate text-xs text-[var(--text-secondary)]">Oferta: {detail.conversation.offerTitle}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {detail.conversation.marketItemId && <Link href={`/rynek?offer=${detail.conversation.marketItemId}`} className="btn btn-ghost btn-sm"><ShoppingBag className="h-3.5 w-3.5" /> Oferta</Link>}
                    <button type="button" onClick={toggleStatus} disabled={busy} className="btn btn-ghost btn-sm"><Archive className="h-3.5 w-3.5" /> {detail.conversation.status === 'open' ? 'Zamknij' : 'Wznów'}</button>
                  </div>
                </header>

                <div className="grid grid-cols-2 gap-px border-b border-white/8 bg-white/8 text-xs">
                  <div className="bg-[var(--bg-panel)] px-4 py-3"><span className="block text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Cena oferty</span><strong className="text-white">{formatSilver(detail.conversation.offerPrice)}</strong></div>
                  <div className="bg-[var(--bg-panel)] px-4 py-3"><span className="block text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Propozycja kupującego</span><strong className="text-amber-300">{formatSilver(detail.conversation.offeredPrice)}</strong></div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-black/10 p-4 sm:p-6">
                  {detail.messages.map((item) => (
                    <div key={item.id} className={`flex ${item.own ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl border px-4 py-3 sm:max-w-[70%] ${item.own ? 'rounded-br-md border-amber-400/25 bg-amber-400/10' : 'rounded-bl-md border-white/10 bg-white/[.045]'}`}>
                        <div className="mb-1 flex items-center justify-between gap-4 text-[9px] uppercase tracking-wide"><strong className={item.own ? 'text-amber-300' : 'text-sky-300'}>{item.own ? 'Ty' : item.senderName}</strong><time className="text-[var(--text-muted)]">{formatDate(item.createdAt)}</time></div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-primary)]">{item.body}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>

                <form onSubmit={sendMessage} className="border-t border-white/8 p-4">
                  {detail.conversation.status === 'open' ? (
                    <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-amber-400/40">
                      <textarea
                        aria-label="Wiadomość handlowa"
                        rows={2}
                        maxLength={1000}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder="Napisz wiadomość… Enter wysyła, Shift+Enter dodaje linię"
                        className="min-h-12 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm outline-none"
                      />
                      <button type="submit" disabled={busy || !message.trim()} className="btn btn-primary h-10 w-10 shrink-0 p-0" aria-label="Wyślij wiadomość"><Send className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-center text-xs text-[var(--text-secondary)]">Ta rozmowa jest zamknięta. Kliknij „Wznów”, aby ponownie napisać.</div>
                  )}
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
