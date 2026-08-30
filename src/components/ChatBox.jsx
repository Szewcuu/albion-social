'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ArrowLeft as CornerUpLeft,
  MessageSquareText as MessageSquareReply,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { scheduleIdleTask } from '@/lib/clientIdle'

function normalizeMessage(message) {
  return { ...message, username: message.username || 'Gracz', reply_to: message.reply_to || null }
}

function MessageText({ text }) {
  const parts = text.split(/(@[\p{L}\p{N}_.-]+)/gu)
  return parts.map((part, index) => part.startsWith('@')
    ? <mark className="chat-mention" key={`${part}-${index}`}>{part}</mark>
    : part)
}

export default function ChatBox({ user, isAdmin }) {
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')
  const [supportsReplies, setSupportsReplies] = useState(true)
  const composerRef = useRef(null)
  const postsRef = useRef(null)
  const oldestCursorRef = useRef(null)
  const scrollModeRef = useRef('bottom')
  const preservedScrollRef = useRef({ height: 0, top: 0 })

  useLayoutEffect(() => {
    const posts = postsRef.current
    if (!posts) return

    if (scrollModeRef.current === 'preserve') {
      const { height, top } = preservedScrollRef.current
      posts.scrollTop = top + Math.max(0, posts.scrollHeight - height)
    } else if (scrollModeRef.current === 'bottom') {
      posts.scrollTop = posts.scrollHeight
    }
    scrollModeRef.current = 'none'
  }, [chatMessages, loading])

  const addOrReplaceMessage = useCallback((incoming) => {
    const normalized = normalizeMessage(incoming)
    const posts = postsRef.current
    const isNearBottom = !posts || posts.scrollHeight - posts.scrollTop - posts.clientHeight < 80
    if (isNearBottom) scrollModeRef.current = 'bottom'
    setChatMessages((current) => {
      const exists = current.some((message) => message.id === normalized.id)
      return exists
        ? current.map((message) => message.id === normalized.id ? normalized : message)
        : [...current, normalized]
    })
  }, [])

  const fetchMessages = useCallback(async ({ older = false } = {}) => {
    if (older) {
      const posts = postsRef.current
      preservedScrollRef.current = { height: posts?.scrollHeight || 0, top: posts?.scrollTop || 0 }
      scrollModeRef.current = 'preserve'
      setLoadingOlder(true)
    } else {
      scrollModeRef.current = 'bottom'
      setLoading(true)
    }
    setLoadError('')

    try {
      const cursor = older ? oldestCursorRef.current : null
      const params = new URLSearchParams()
      if (cursor) {
        params.set('beforeCreatedAt', cursor.created_at)
        params.set('beforeId', cursor.id)
      }
      const response = await authenticatedFetch(`/api/chat${params.size ? `?${params}` : ''}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się pobrać rozmowy.')

      oldestCursorRef.current = result.cursor || null
      const chronologicalPage = (result.messages || []).map(normalizeMessage)
      setSupportsReplies(result.supportsReplies !== false)
      setHasOlder(result.hasOlder === true)
      setChatMessages((current) => {
        if (!older) return chronologicalPage
        const known = new Set(current.map((message) => message.id))
        return [...chronologicalPage.filter((message) => !known.has(message.id)), ...current]
      })
    } catch {
      setLoadError('Nie udało się otworzyć kroniki rozmów. Odśwież widok lub spróbuj ponownie później.')
    }
    if (older) setLoadingOlder(false)
    else setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    let chatChannel = null
    let realtimeClient = null
    // Sama kronika jest podstawową treścią Tawerny — nie czekamy z nią na bezczynność
    // przeglądarki. Cięższe połączenie Realtime nadal uruchamiamy później.
    const initialFetchId = window.setTimeout(() => void fetchMessages(), 0)
    const cancelRealtime = scheduleIdleTask(async () => {
      const { supabase } = await import('@/lib/supabase')
      if (!active) return
      realtimeClient = supabase
      chatChannel = realtimeClient
        .channel('community-tavern')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status !== 'visible') {
            setChatMessages((current) => current.filter((message) => message.id !== payload.new.id))
          } else if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new.channel === 'GLOBALNY' && payload.new.status === 'visible') {
            addOrReplaceMessage(payload.new)
          }
          if (payload.eventType === 'DELETE') {
            setChatMessages((current) => current.filter((message) => message.id !== payload.old.id))
          }
        })
        .subscribe((status) => {
          setConnectionStatus(status === 'SUBSCRIBED' ? 'LIVE' : status === 'CHANNEL_ERROR' ? 'ERROR' : 'CONNECTING')
        })
    }, { minimumDelay: 7_000, timeout: 8_000 })

    return () => {
      active = false
      window.clearTimeout(initialFetchId)
      cancelRealtime()
      if (chatChannel && realtimeClient) void realtimeClient.removeChannel(chatChannel)
    }
  }, [addOrReplaceMessage, fetchMessages])

  const messagesById = useMemo(
    () => new Map(chatMessages.map((message) => [message.id, message])),
    [chatMessages],
  )

  const connectionLabel = connectionStatus === 'LIVE'
    ? 'Na żywo'
    : connectionStatus === 'ERROR'
      ? 'Tryb ręczny'
      : 'Łączenie'

  const startReply = (message) => {
    setReplyingTo(message)
    const mention = `@${message.username.replace(/\s+/g, '')}`
    setNewMessage((current) => current.startsWith(mention) ? current : `${mention} ${current}`)
    composerRef.current?.focus()
  }

  const jumpToMessage = (messageId) => {
    const element = document.getElementById(`chat-message-${messageId}`)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(messageId)
    window.setTimeout(() => setHighlightedId(null), 1800)
  }

  const handleSendChatMessage = async (event) => {
    event.preventDefault()
    const text = newMessage.trim()
    if (!text || !user || isSending) return

    setIsSending(true)
    setSendError('')
    const payload = {
      text,
      ...(supportsReplies && replyingTo ? { replyTo: replyingTo.id } : {}),
    }

    try {
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się wysłać wiadomości.')
      scrollModeRef.current = 'bottom'
      addOrReplaceMessage(result.message)
      setSupportsReplies(result.supportsReplies !== false)
      setNewMessage('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Błąd wysyłania wiadomości Tawerny:', error)
      setSendError('Wiadomość nie została zapisana. Sprawdź sesję i spróbuj ponownie.')
    }
    setIsSending(false)
  }

  const handleComposerKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  const deleteChatMessage = async (message) => {
    if (!(isAdmin || message.user_id === user?.id)) return
    if (pendingDeleteId !== message.id) {
      setPendingDeleteId(message.id)
      return
    }

    try {
      const response = await authenticatedFetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: message.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się usunąć wiadomości.')
      setChatMessages((current) => current.filter((item) => item.id !== message.id))
      setPendingDeleteId(null)
    } catch (error) {
      console.error('Błąd usuwania wiadomości Tawerny:', error)
      setSendError('Nie udało się usunąć wiadomości.')
    }
  }

  return (
    <section className="community-forum tavern-forum !m-0 !w-full rounded-2xl border border-[var(--border)] overflow-hidden" aria-labelledby="community-title">
      <header className="community-forum-header !py-4 !px-5 flex items-center justify-between">
        <div>
          <div className="community-overline"><Users aria-hidden="true" /> Kronika społeczności</div>
          <h2 id="community-title" className="!mt-1.5 !text-[clamp(1.35rem,2vw,1.8rem)]">Główna sala Tawerny</h2>
          <p className="!mt-1 !text-[11px]">Rozmowy graczy ze wszystkich serwerów Albion Online.</p>
        </div>
        <div className={`community-connection ${connectionStatus.toLowerCase()} text-xs`}>
          <span className="status-dot" />
          {connectionLabel}
        </div>
      </header>

      <div className="community-layout community-single">
        <div className="community-thread">
          <div className="community-thread-heading !py-2 !px-4 text-xs">
            <div><Sparkles aria-hidden="true" /><span className="text-xs"><strong>Ostatnie wiadomości</strong> <small className="text-[10px]">{chatMessages.length} w kronice</small></span></div>
            <button type="button" onClick={() => fetchMessages()} aria-label="Odśwież rozmowę" disabled={loading}>
              <RefreshCw aria-hidden="true" className={loading ? 'spin' : ''} />
            </button>
          </div>

          <div ref={postsRef} className="community-posts !max-h-[340px] sm:!max-h-[360px] overflow-y-auto" aria-live="polite">
            {loading ? (
              <div className="community-empty"><RefreshCw className="spin" aria-hidden="true" /><strong>Otwieramy kronikę rozmów…</strong></div>
            ) : loadError ? (
              <div className="community-empty error"><strong>Brama komunikacyjna nie odpowiada</strong><p>{loadError}</p><button type="button" className="btn btn-ghost btn-sm" onClick={fetchMessages}>Spróbuj ponownie</button></div>
            ) : chatMessages.length === 0 ? (
              <div className="community-empty"><MessageSquareReply aria-hidden="true" /><strong>Rozpal pierwszą rozmowę</strong><p>Tawerna jest jeszcze pusta. Napisz pierwszą wiadomość do kompanii.</p></div>
            ) : <>
              {hasOlder && (
                <div className="flex justify-center border-b border-white/5 p-2">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={loadingOlder} onClick={() => fetchMessages({ older: true })}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingOlder ? 'spin' : ''}`} /> {loadingOlder ? 'Wczytywanie…' : 'Wczytaj starsze wiadomości'}
                  </button>
                </div>
              )}
              {chatMessages.map((message) => {
              const ownMessage = message.user_id === user?.id
              const displayName = (message.username || 'System').replace(/#0$/, '')
              const avatarUrl = ownMessage ? user?.user_metadata?.avatar_url : null
              const parentMessage = message.reply_to ? messagesById.get(message.reply_to) : null
              const time = message.created_at
                ? new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))
                : ''

              return (
                <article
                  id={`chat-message-${message.id}`}
                  key={message.id}
                  className={`community-post ${ownMessage ? 'own' : ''} ${highlightedId === message.id ? 'highlighted' : ''}`}
                >
                  <div className="community-avatar">{avatarUrl ? <Image src={avatarUrl} alt="" width={42} height={42} /> : displayName.charAt(0).toUpperCase()}</div>
                  <div className="community-post-content">
                    <header><strong>{displayName}</strong>{ownMessage && <span>Ty</span>}<time>{time}</time></header>
                    {message.reply_to && (
                      <button type="button" className="reply-quote" onClick={() => jumpToMessage(message.reply_to)}>
                        <CornerUpLeft aria-hidden="true" />
                        <span><strong>{parentMessage?.username || 'Usunięta wiadomość'}</strong><small>{parentMessage?.text || 'Oryginalna wiadomość nie jest już dostępna.'}</small></span>
                      </button>
                    )}
                    <p><MessageText text={message.text} /></p>
                    {message.channel !== 'SYSTEM' && (
                      <div className="community-post-actions">
                        <button type="button" onClick={() => startReply(message)}><MessageSquareReply aria-hidden="true" /> Odpowiedz</button>
                        {(isAdmin || ownMessage) && (
                          <button type="button" className={pendingDeleteId === message.id ? 'confirm-delete' : ''} onClick={() => deleteChatMessage(message)}>
                            <Trash2 aria-hidden="true" /> {pendingDeleteId === message.id ? 'Potwierdź usunięcie' : 'Usuń'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              )
              })}
            </>}
          </div>

          <form className="community-composer !p-3" onSubmit={handleSendChatMessage}>
            {replyingTo && (
              <div className="composer-reply-preview">
                <CornerUpLeft aria-hidden="true" />
                <span><small>Odpowiadasz użytkownikowi</small><strong>{replyingTo.username}</strong><em>{replyingTo.text}</em></span>
                <button type="button" onClick={() => setReplyingTo(null)} aria-label="Anuluj odpowiedź"><X aria-hidden="true" /></button>
              </div>
            )}
            <label htmlFor="community-message" className="sr-only">Napisz wiadomość w tawernie</label>
            <div>
              <textarea
                ref={composerRef}
                id="community-message"
                maxLength={500}
                rows={1}
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Napisz wiadomość w tawernie (Enter wyślij)…"
                className="!min-h-[42px] !h-10 !py-2.5"
              />
              <button type="submit" className="btn btn-primary" disabled={!newMessage.trim() || isSending}>
                <Send aria-hidden="true" /> {isSending ? '...' : 'Wyślij'}
              </button>
            </div>
            <footer><span>{newMessage.length}/500</span><span><kbd>Enter</kbd> wyślij · <kbd>Shift</kbd> + <kbd>Enter</kbd> nowa linia</span></footer>
            {!supportsReplies && replyingTo && <p className="community-form-note">Wzmianka zostanie wysłana, a podgląd cytatu pojawi się po wdrożeniu najnowszej migracji bazy.</p>}
            {sendError && <p className="community-form-error" role="alert">{sendError}</p>}
          </form>
        </div>
      </div>
    </section>
  )
}
