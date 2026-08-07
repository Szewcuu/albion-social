'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Radio, Send, Trash2 } from 'lucide-react'

export default function ChatBox({ user, isAdmin }) {
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [activeChannel, setActiveChannel] = useState('GLOBALNY')
  const chatLoading = chatMessages.length === 0
  const chatContainerRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const fetchInitialChat = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: true })
        .limit(50)
        
      if (!isMounted) return
      if (data && data.length > 0) {
        const mapped = data.map(msg => ({
          ...msg,
          username: msg.username || msg.profiles?.username || 'Gracz',
          avatar_url: msg.avatar_url || msg.profiles?.avatar_url || null
        }))
        setChatMessages(mapped)
      } else {
        setChatMessages([{ id: 'init', channel: 'SYSTEM', username: 'System', text: 'Połączono z węzłem miejskim AOPP. Czat aktywny.' }])
      }
    }

    fetchInitialChat()

    const chatChannel = supabase
      .channel('schema-db-chat-component')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (!isMounted) return
          if (payload.eventType === 'INSERT') {
            setChatMessages((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'DELETE') {
            setChatMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(chatChannel)
    }
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages, activeChannel])

  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const rawName = user.user_metadata?.full_name || user.user_metadata?.name || 'Gracz'
    const cleanUsername = rawName.replace(/#0$/, '')

    const { error } = await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        channel: activeChannel,
        username: cleanUsername,
        text: newMessage.trim()
      }
    ])

    if (!error) setNewMessage('')
  }

  const deleteChatMessage = async (msgId) => {
    if (!isAdmin) return
    if (confirm('Czy na pewno chcesz usunąć tę wiadomość z czatu?')) {
      const { error } = await supabase.from('chat_messages').delete().eq('id', msgId)
      if (!error) {
        setChatMessages((prev) => prev.filter((msg) => msg.id !== msgId))
      }
    }
  }

  return (
    <div className="aopp-panel flex h-[600px] flex-col justify-between rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between border-b border-[#200d13] pb-4 mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#f3ba2f]">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>STRUMIEŃ KOMUNIKACJI</span>
        </div>
        
        <div className="flex gap-1.5 flex-wrap">
          {['GLOBALNY', 'HANDEL', 'REKRUTACJA', 'SYSTEM'].map((ch) => (
            <button 
              key={ch} 
              onClick={() => setActiveChannel(ch)} 
              className={`px-3 py-1.5 rounded-xl transition-all text-[11px] font-mono cursor-pointer ${
                activeChannel === ch 
                  ? 'bg-[#f3ba2f] text-black font-extrabold shadow-[0_0_10px_rgba(243,186,47,0.3)]' 
                  : 'text-gray-400 bg-[#050204] hover:text-gray-200 border border-[#200d13]'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        className="space-y-3 overflow-y-auto flex-1 w-full pr-2 text-sm select-text flex flex-col my-2"
      >
        {chatLoading ? (
          <p className="text-gray-500 italic text-center py-10">Ładowanie bufora wiadomości...</p>
        ) : (
          chatMessages
            .filter(msg => activeChannel === 'GLOBALNY' || msg.channel === activeChannel || msg.channel === 'SYSTEM')
            .map((msg) => {
              const messageTime = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
              const userAvatar = msg.avatar_url || (msg.user_id === user?.id ? user?.user_metadata?.avatar_url : null);
              const cleanDisplayName = (msg.username || 'System').replace(/#0$/, '');

              return (
                <div key={msg.id} className="flex items-start gap-3 rounded-2xl border border-white/[.06] bg-black/25 p-3.5 transition-colors hover:border-[#cba84e]/20 hover:bg-black/35">
                  {userAvatar && msg.channel !== 'SYSTEM' ? (
                    <Image src={userAvatar} alt={`Avatar użytkownika ${cleanDisplayName}`} width={36} height={36} className="w-9 h-9 rounded-xl object-cover border border-[#3d1823] shrink-0 shadow" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-[#12070a] border border-[#3d1823] text-[#f3ba2f]">
                      {cleanDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-xs ${msg.role === 'ADMIN' ? 'text-[#f3ba2f] font-serif' : 'text-sky-400'}`}>
                        {cleanDisplayName}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">{messageTime}</span>

                      {isAdmin && msg.channel !== 'SYSTEM' && (
                        <button onClick={() => deleteChatMessage(msg.id)} aria-label="Usuń wiadomość" title="Usuń wiadomość" className="text-rose-400 hover:text-rose-300 text-xs ml-auto cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
                    </div>

                    <p className="text-gray-200 mt-1 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })
        )}
      </div>

      <form onSubmit={handleSendChatMessage} className="mt-2 flex items-center gap-2 rounded-2xl border border-[#cba84e]/15 bg-black/35 p-2.5 pl-4 transition-colors focus-within:border-[#cba84e]/50">
        <input
          type="text"
          maxLength="120"
          disabled={activeChannel === 'SYSTEM'}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={activeChannel === 'SYSTEM' ? 'Kanał systemowy zablokowany...' : `Napisz wiadomość na kanale ${activeChannel.toLowerCase()}...`}
          className="flex-1 bg-transparent text-xs sm:text-sm text-gray-100 focus:outline-none placeholder-gray-500"
        />

        <button 
          type="submit" 
          disabled={activeChannel === 'SYSTEM'} 
          className="bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase transition disabled:hidden flex items-center gap-1.5 shadow cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Wyślij</span>
        </button>
      </form>
    </div>
  )
}
