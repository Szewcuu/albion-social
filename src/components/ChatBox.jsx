'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  CornerUpLeft,
  MessageSquareReply,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const BASE_FIELDS = 'id, user_id, channel, username, text, created_at'
const REPLY_FIELDS = `${BASE_FIELDS}, reply_to`

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
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')
  const [supportsReplies, setSupportsReplies] = useState(true)
  const composerRef = useRef(null)

  const addOrReplaceMessage = useCallback((incoming) => {
    const normalized = normalizeMessage(incoming)
    setChatMessages((current) => {
      const exists = current.some((message) => message.id === normalized.id)
      return exists
        ? current.map((message) => message.id === normalized.id ? normalized : message)
        : [...current, normalized]
    })
  }, [])

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    let result = await supabase
      .from('chat_messages')
      .select(REPLY_FIELDS)
      .eq('channel', 'GLOBALNY')
      .order('created_at', { ascending: false })
      .limit(100)

    if (result.error) {
      const fallback = await supabase
        .from('chat_messages')
        .select(BASE_FIELDS)
        .eq('channel', 'GLOBALNY')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!fallback.error) {
        result = fallback
        setSupportsReplies(false)
      }
    }

    if (result.error) {
      setLoadError('Nie udało się otworzyć kroniki rozmów. Odśwież widok lub spróbuj ponownie później.')
    } else {
      setChatMessages((result.data || []).reverse().map(normalizeMessage))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(fetchMessages, 0)
    const chatChannel = supabase
      .channel('community-tavern')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new.channel === 'GLOBALNY') {
          addOrReplaceMessage(payload.new)
        }
        if (payload.eventType === 'DELETE') {
          setChatMessages((current) => current.filter((message) => message.id !== payload.old.id))
        }
      })
      .subscribe((status) => {
        setConnectionStatus(status === 'SUBSCRIBED' ? 'LIVE' : status === 'CHANNEL_ERROR' ? 'ERROR' : 'CONNECTING')
      })

    return () => {
      window.clearTimeout(loadTimer)
      supabase.removeChannel(chatChannel)
    }
  }, [addOrReplaceMessage, fetchMessages])

  const messagesById = useMemo(
    () => new Map(chatMessages.map((message) => [message.id, message])),
    [chatMessages],
  )

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
    const rawName = user.user_metadata?.full_name || user.user_metadata?.name || 'Gracz'
    const payload = {
      user_id: user.id,
      channel: 'GLOBALNY',
      username: rawName.replace(/#0$/, ''),
      text,
      ...(supportsReplies && replyingTo ? { reply_to: replyingTo.id } : {}),
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(payload)
      .select(supportsReplies ? REPLY_FIELDS : BASE_FIELDS)
      .single()

    if (error) {
      setSendError('Wiadomość nie została zapisana. Sprawdź sesję i spróbuj ponownie.')
    } else {
      addOrReplaceMessage(data)
      setNewMessage('')
      setReplyingTo(null)
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

    const { error } = await supabase.from('chat_messages').delete().eq('id', message.id)
    if (error) {
      setSendError('Nie udało się usunąć wiadomości.')
      return
    }
    setChatMessages((current) => current.filter((item) => item.id !== message.id))
    setPendingDeleteId(null)
  }

  return (
    <section className="community-forum" aria-labelledby="community-title">
      <header className="community-forum-header">
        <div>
          <span className="community-overline"><Users aria-hidden="true" /> Forum kompanii</span>
          <h2 id="community-title">Tawerna społeczności</h2>
          <p>Jedna wspólna rozmowa graczy. Handel, rekrutacja i organizacja wypraw pozostają w wyspecjalizowanych modułach.</p>
        </div>
        <div className={`community-connection ${connectionStatus.toLowerCase()}`}>
          <span className="status-dot" />
          {connectionStatus === 'LIVE' ? 'Rozmowa na żywo' : connectionStatus === 'ERROR' ? 'Tryb odświeżania' : 'Łączenie'}
        </div>
      </header>

      <div className="community-layout community-single">
        <div className="community-thread">
          <div className="community-thread-heading">
            <div><Sparkles aria-hidden="true" /><span><strong>Główna sala tawerny</strong><small>{chatMessages.length} ostatnich wiadomości</small></span></div>
            <button type="button" onClick={fetchMessages} aria-label="Odśwież rozmowę" disabled={loading}>
              <RefreshCw aria-hidden="true" className={loading ? 'spin' : ''} />
            </button>
          </div>

          <div className="community-posts" aria-live="polite">
            {loading ? (
              <div className="community-empty"><RefreshCw className="spin" aria-hidden="true" /><strong>Otwieramy kronikę rozmów…</strong></div>
            ) : loadError ? (
              <div className="community-empty error"><strong>Brama komunikacyjna nie odpowiada</strong><p>{loadError}</p><button type="button" className="btn btn-ghost btn-sm" onClick={fetchMessages}>Spróbuj ponownie</button></div>
            ) : chatMessages.length === 0 ? (
              <div className="community-empty"><MessageSquareReply aria-hidden="true" /><strong>Rozpal pierwszą rozmowę</strong><p>Tawerna jest jeszcze pusta. Napisz pierwszą wiadomość do kompanii.</p></div>
            ) : chatMessages.map((message) => {
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
          </div>

          <form className="community-composer" onSubmit={handleSendChatMessage}>
            {replyingTo && (
              <div className="composer-reply-preview">
                <CornerUpLeft aria-hidden="true" />
                <span><small>Odpowiadasz użytkownikowi</small><strong>{replyingTo.username}</strong><em>{replyingTo.text}</em></span>
                <button type="button" onClick={() => setReplyingTo(null)} aria-label="Anuluj odpowiedź"><X aria-hidden="true" /></button>
              </div>
            )}
            <label htmlFor="community-message">Napisz wiadomość w tawernie</label>
            <div>
              <textarea
                ref={composerRef}
                id="community-message"
                maxLength={500}
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Podziel się informacją, zadaj pytanie albo zbierz drużynę…"
              />
              <button type="submit" className="btn btn-primary" disabled={!newMessage.trim() || isSending}>
                <Send aria-hidden="true" /> {isSending ? 'Wysyłanie…' : 'Opublikuj'}
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
