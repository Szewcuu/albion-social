'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, ShoppingBag, Shield, MessageSquare, ExternalLink, LogIn, LogOut, ScrollText, Users } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}` }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10 text-sm">
      
      {/* PASEK NAWIGACJI / AUTORYZACJA */}
      <nav className="flex items-center justify-between bg-[#120a0c]/90 border border-[#3a1a1e] p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2b0d10] border border-[#c59b27] flex items-center justify-center shadow">
            <Swords className="w-5 h-5 text-[#c59b27]" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-100 uppercase tracking-wider font-serif">
              Albion Online Polska
            </h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Węzeł Społeczności Caerleon</p>
          </div>
        </div>

        <div>
          {loading ? (
            <span className="text-xs text-gray-500 animate-pulse font-mono">Łączenie z bramą...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-300 hidden sm:inline">
                {user?.user_metadata?.custom_claims?.global_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-[#2b0d10] hover:bg-red-900 border border-red-700/60 text-red-200 font-bold py-2 px-3 text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Wyloguj</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-2 px-4 text-xs uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-[#c59b27]/10 font-serif"
            >
              <LogIn className="w-4 h-4" />
              <span>Zaloguj przez Discord</span>
            </button>
          )}
        </div>
      </nav>

      {/* NAGŁÓWEK GŁÓWNY */}
      <header className="relative bg-[#120a0c]/90 border-2 border-[#c59b27]/80 p-8 sm:p-12 shadow-[0_0_35px_rgba(197,155,39,0.15)] overflow-hidden text-center backdrop-blur-md">
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <span className="inline-block bg-[#2b0d10] text-red-400 border border-red-900/60 px-3 py-1 text-xs font-bold uppercase tracking-widest">
            Centrum Królewskie
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-100 uppercase tracking-wider font-serif leading-tight">
            Polski Portal Albion Online
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl mx-auto">
            Główne centrum dowodzenia i tablica ogłoszeń dla polskich graczy. Szukaj gildii, handluj ekwipunkiem i twórz najlepsze zestawy bojowe.
          </p>
        </div>
      </header>

      {/* SZYBKIE KAFELKI MODUŁÓW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KAFEL 1: REJESTR GILDII */}
        <Link href="/gildie" className="group bg-[#120a0c]/80 border border-[#3a1a1e] hover:border-[#c59b27]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#080506] border border-[#3a1a1e] group-hover:border-[#c59b27] flex items-center justify-center transition">
              <Users className="w-5 h-5 text-[#c59b27]" />
            </div>
            <h3 className="text-lg font-black text-gray-100 uppercase font-serif tracking-wider group-hover:text-[#c59b27] transition">
              Rejestr Gildii
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Przeglądaj aktywne sojusze, sprawdzaj wymagania rekrutacyjne i wysyłaj aplikacje do liderów.
            </p>
          </div>
          <span className="mt-6 text-xs font-bold text-[#c59b27] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Otwórz rejestr</span> →
          </span>
        </Link>

        {/* KAFEL 2: RYNEK */}
        <Link href="/rynek" className="group bg-[#120a0c]/80 border border-[#3a1a1e] hover:border-[#c59b27]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#080506] border border-[#3a1a1e] group-hover:border-[#c59b27] flex items-center justify-center transition">
              <ShoppingBag className="w-5 h-5 text-[#c59b27]" />
            </div>
            <h3 className="text-lg font-black text-gray-100 uppercase font-serif tracking-wider group-hover:text-[#c59b27] transition">
              Rynek Handlowy
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Wystawiaj przedmioty, wierzchowce i surowce na sprzedaż. Wymieniaj się z innymi graczami bez prowizji.
            </p>
          </div>
          <span className="mt-6 text-xs font-bold text-[#c59b27] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Przeglądaj oferty</span> →
          </span>
        </Link>

        {/* KAFEL 3: BUILDY */}
        <Link href="/buildy" className="group bg-[#120a0c]/80 border border-[#3a1a1e] hover:border-[#c59b27]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#080506] border border-[#3a1a1e] group-hover:border-[#c59b27] flex items-center justify-center transition">
              <Shield className="w-5 h-5 text-[#c59b27]" />
            </div>
            <h3 className="text-lg font-black text-gray-100 uppercase font-serif tracking-wider group-hover:text-[#c59b27] transition">
              Kreator Buildów
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Odkrywaj najlepsze zestawy wyposażenia do PvP, ZvZ, Statyków i Solo Ganków przygotowane przez graczy.
            </p>
          </div>
          <span className="mt-6 text-xs font-bold text-[#c59b27] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Zobacz zestawy</span> →
          </span>
        </Link>

      </div>

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