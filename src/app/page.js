'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { 
  Swords, ShoppingBag, Shield, MessageSquare, LogIn, LogOut, 
  Clock, Users, Send, Flame
} from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // CZAT NA ŻYWO
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const chatEndRef = useRef(null)

  // ZEGAR ALBION (UTC)
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    // Sprawdzanie sesji użytkownika
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Zegar UTC Albion
    const updateClock = () => {
      const now = new Date()
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC')
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)

    // Pobieranie początkowych wiadomości czatu
    fetchMessages()

    // Subskrypcja wiadomości w czasie rzeczywistym - optymalna bez ponownego fetchowania bazy
    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
        scrollToBottom()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .order('created_at', { ascending: true })
      .limit(50)

    if (!error && data) {
      setMessages(data)
      scrollToBottom()
    }
  }

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  // LOGOWANIE GOOGLE
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}` }
    })
  }

  // LOGOWANIE DISCORD
  const handleDiscordLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}` }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const messageText = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        content: messageText,
      }
    ])

    if (error) {
      console.error('Błąd wysyłania wiadomości:', error)
    }
  }

  return (
    <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10 text-base">
      
      {/* PASEK NAWIGACJI & AUTORYZACJA */}
      <nav className="flex flex-wrap items-center justify-between gap-4 bg-[#120a0c] border border-[#3a1a1e] p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2b0d10] border border-[#c59b27] flex items-center justify-center shadow">
            <Swords className="w-6 h-6 text-[#c59b27]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-100 uppercase tracking-wider font-serif">
              Albion Online Polska
            </h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Węzeł Społeczności Caerleon</p>
          </div>
        </div>

        {/* ZEGAR SERWEROWY UTC ALBION */}
        <div className="hidden md:flex items-center gap-2 bg-[#080506] border border-[#2b181a] px-4 py-2 rounded-sm text-xs font-mono text-[#c59b27] transform-gpu">
          <Clock className="w-4 h-4 text-[#c59b27] animate-pulse" />
          <span>Czas Albion: <b>{utcTime || '00:00:00 UTC'}</b></span>
        </div>

        <div>
          {loading ? (
            <span className="text-xs text-gray-500 animate-pulse font-mono">Łączenie z bramą...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-200 hidden sm:inline">
                {user?.user_metadata?.full_name || user?.user_metadata?.custom_claims?.global_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-[#2b0d10] hover:bg-red-900 border border-red-700/60 text-red-200 font-bold py-2 px-3 text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Wyloguj</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogleLogin}
                className="bg-white hover:bg-gray-100 text-gray-900 font-bold py-2 px-3 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                onClick={handleDiscordLogin}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2 px-3 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow"
              >
                <LogIn className="w-4 h-4" />
                <span>Discord</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* NAGŁÓWEK GŁÓWNY Z TIMERA-MI RESETÓW */}
      <header className="relative bg-[#120a0c] border-2 border-[#c59b27]/80 p-6 sm:p-10 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <span className="inline-flex items-center gap-1.5 bg-[#2b0d10] text-red-400 border border-red-900/60 px-3 py-1 text-xs font-bold uppercase tracking-widest">
              <Flame className="w-3.5 h-3.5" /> Centrum Królewskie Caerleon
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-100 uppercase tracking-wider font-serif leading-tight">
              Polski Portal Albion Online
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
              Główne centrum dowodzenia i tablica ogłoszeń dla polskich graczy. Szukaj gildii, organizuj się na ZvZ, handluj ekwipunkiem i rozmawiaj na żywo.
            </p>
          </div>

          <div className="lg:col-span-4 bg-[#080506] border border-[#2b181a] p-4 space-y-3">
            <h3 className="text-xs font-black text-[#c59b27] uppercase tracking-wider flex items-center gap-1.5 font-serif border-b border-[#2b181a] pb-2">
              <Clock className="w-4 h-4" /> Timery ZvZ &amp; Resetów
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-300">
                <span>Serwer Europa (ZvZ Main):</span>
                <span className="font-mono font-bold text-amber-400">18:00 / 20:00 UTC</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Przerwa Techniczna:</span>
                <span className="font-mono font-bold text-gray-400">10:00 UTC</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Serwer Ameryka:</span>
                <span className="font-mono font-bold text-purple-400">00:00 / 03:00 UTC</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SZYBKIE KAFELKI MODUŁÓW NAWIGACJI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/gildie" className="group bg-[#120a0c] border border-[#3a1a1e] hover:border-[#c59b27]/80 p-6 shadow-xl transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#080506] border border-[#3a1a1e] group-hover:border-[#c59b27] flex items-center justify-center transition">
              <Users className="w-5 h-5 text-[#c59b27]" />
            </div>
            <h3 className="text-xl font-black text-gray-100 uppercase font-serif tracking-wider group-hover:text-[#c59b27] transition">
              Rejestr Gildii
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Przeglądaj aktywne sojusze, sprawdzaj wymagania rekrutacyjne i wysyłaj aplikacje prosto do rekrutera.
            </p>
          </div>
          <span className="mt-6 text-xs font-bold text-[#c59b27] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Otwórz rejestr</span> →
          </span>
        </Link>

        <Link href="/rynek" className="group bg-[#120a0c] border border-[#3a1a1e] hover:border-[#c59b27]/80 p-6 shadow-xl transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#080506] border border-[#3a1a1e] group-hover:border-[#c59b27] flex items-center justify-center transition">
              <ShoppingBag className="w-5 h-5 text-[#c59b27]" />
            </div>
            <h3 className="text-xl font-black text-gray-100 uppercase font-serif tracking-wider group-hover:text-[#c59b27] transition">
              Rynek Handlowy
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Wystawiaj przedmioty, wierzchowce i surowce na sprzedaż. Wymieniaj się z innymi graczami bez prowizji.
            </p>
          </div>
          <span className="mt-6 text-xs font-bold text-[#c59b27] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Przeglądaj oferty</span> →
          </span>
        </Link>

        <Link href="/buildy" className="group bg-[#120a0c] border border-[#3a1a1e] hover:border-[#c59b27]/80 p-6 shadow-xl transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#080506] border border-[#3a1a1e] group-hover:border-[#c59b27] flex items-center justify-center transition">
              <Shield className="w-5 h-5 text-[#c59b27]" />
            </div>
            <h3 className="text-xl font-black text-gray-100 uppercase font-serif tracking-wider group-hover:text-[#c59b27] transition">
              Kreator Buildów
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Odkrywaj najlepsze zestawy wyposażenia do PvP, ZvZ, Statyków i Solo Ganków przygotowane przez społeczność.
            </p>
          </div>
          <span className="mt-6 text-xs font-bold text-[#c59b27] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Zobacz zestawy</span> →
          </span>
        </Link>
      </div>

      {/* ODNAWIONY I BARDZO SZYBKI CZAT NA ŻYWO */}
      <section className="bg-[#120a0c] border border-[#3a1a1e] p-6 shadow-2xl space-y-4 transform-gpu">
        <div className="flex items-center justify-between border-b border-[#3a1a1e] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#c59b27]" />
            <h2 className="text-lg font-black text-gray-100 uppercase font-serif tracking-wider">
              Karczma Caerleon (Czat Ogólny)
            </h2>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Realtime
          </span>
        </div>

        {/* OKNO WIADOMOŚCI CZATU */}
        <div className="h-64 bg-[#080506] border border-[#2b181a] p-4 overflow-y-auto space-y-3 font-sans">
          {messages.length === 0 ? (
            <p className="text-xs text-gray-500 italic text-center py-8">Brak wiadomości. Bądź pierwszy i przywitaj się w karczmie!</p>
          ) : (
            messages.map((msg, index) => (
              <div key={msg.id || index} className="text-xs sm:text-sm leading-relaxed flex items-start gap-2">
                <span className="text-gray-500 text-[10px] font-mono shrink-0 mt-0.5">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                <div>
                  <span className="font-bold text-[#c59b27] mr-1.5">
                    {msg.profiles?.username || msg.username || 'Gracz'}:
                  </span>
                  <span className="text-gray-200">{msg.content}</span>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT WYSYŁANIA WIADOMOŚCI */}
        {!user ? (
          <p className="text-xs text-gray-400 italic text-center py-2 bg-[#080506] border border-[#2b181a]">
            Zaloguj się przez Google lub Discord powyżej, aby pisać na czacie.
          </p>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Napisz wiadomość na czacie ogólnym..."
              className="flex-1 bg-[#080506] border border-[#2b181a] p-2.5 text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-[#c59b27] transition"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black px-5 py-2.5 text-xs uppercase tracking-widest font-serif flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Wyślij</span>
            </button>
          </form>
        )}
      </section>

      {/* FOOTER STRONY GŁÓWNEJ */}
      <footer className="w-full bg-[#050304] border-t border-[#3a1a1e] py-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#c59b27] font-bold">Albion Online Polska Portal</span>.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/regulamin" className="hover:text-gray-300 transition">Regulamin</Link>
            <Link href="/prywatnosc" className="hover:text-gray-300 transition">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}