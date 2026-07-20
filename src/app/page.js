'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sprawdzenie obecnej sesji użytkownika przy załadowaniu strony
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Nasłuchiwanie na zmiany stanu autoryzacji (zalogowanie/wylogowanie)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loginWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121216] text-gray-400 flex items-center justify-center font-mono text-base animate-pulse">
        Wczytywanie zwojów miejskich...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#121216] text-gray-200 antialiased relative overflow-hidden flex flex-col items-center justify-center px-4 font-sans">
      
      {/* DEKLARACJA CZCIONEK I ANIMACJI RPG */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;700;900&display=swap');
        .font-albion-title { font-family: 'Cinzel', serif; }
        
        @keyframes bgDrift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-bg-drift {
          background: linear-gradient(-45deg, #121216, #1a191f, #221c15, #16151a);
          background-size: 300% 300%;
          animation: bgDrift 35s ease infinite;
        }
      `}</style>

      {/* ROZJAŚNIONE DYNAMICZNE TŁO I WIĘKSZA WINIETA */}
      <div className="absolute inset-0 animate-bg-drift opacity-90 z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)] pointer-events-none z-0"></div>

      {/* 1. EKRAN DLA NIEZALOGOWANYCH GOŚCI */}
      {!user ? (
        <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-5xl mx-auto z-10 space-y-12 px-6 py-16">
          
          {/* NAGŁÓWEK POWITALNY */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-[#c59b27] tracking-widest font-albion-title drop-shadow-[0_5px_15px_rgba(0,0,0,0.6)]">
              ALBION ONLINE POLSKA
            </h1>
            <p className="text-base sm:text-lg text-gray-300 uppercase tracking-widest font-bold max-w-2xl mx-auto leading-relaxed">
              Polski węzeł społecznościowy: kalkulatory handlowe, zbrojownia taktyczna oraz rejestr gildii
            </p>
          </div>

          {/* GŁÓWNY PANEL LOGOWANIA */}
          <div className="max-w-md w-full bg-[#141419] border-2 border-[#c59b27] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.9)] rounded-sm">
            <span className="text-xs text-[#c59b27] font-bold tracking-widest block uppercase font-mono mb-4">BRAMA DO KRONIK MIEJSKICH</span>
            
            <div className="space-y-4">
              {/* LOGOWANIE DISCORD */}
              <button 
                onClick={loginWithDiscord} 
                className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-4 px-8 border border-[#4a3a1d] tracking-wider text-sm uppercase transition font-albion-title active:scale-95 shadow-md"
              >
                Zaloguj przez Discord
              </button>

              {/* LOGOWANIE GOOGLE (WKRÓTCE) */}
              <button 
                disabled 
                className="w-full bg-[#16161c]/50 text-gray-600 font-black py-4 px-8 border border-[#2c2c3b]/50 tracking-wider text-sm uppercase font-albion-title cursor-not-allowed flex items-center justify-center gap-2 relative"
              >
                <span>Zaloguj przez Google</span>
                <span className="text-[10px] bg-[#f0b73a] text-black px-2 py-0.5 rounded-sm font-sans font-black tracking-normal normal-case shadow-[0_0_10px_rgba(240,183,58,0.4)]">
                  Wkrótce
                </span>
              </button>
            </div>
          </div>

          {/* PRAWDZIWE OPISY MODUŁÓW ZWIĘKSZAJĄCE CZYTELNOŚĆ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-sm">
            <div className="bg-[#141419]/60 border border-[#23232c] p-6 rounded-sm shadow-xl space-y-3 backdrop-blur-sm">
              <div className="text-2xl">📊</div>
              <h3 className="font-bold text-[#c59b27] font-albion-title text-base tracking-wide uppercase">Kalkulator Caerleon</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Analizuj marże transportowe i zyski ze skupu na Czarnym Rynku. Pobieraj aktualne ceny live i sprawdzaj rentowność flipów przed wyruszeniem z karawaną handlową.
              </p>
            </div>

            <div className="bg-[#141419]/60 border border-[#23232c] p-6 rounded-sm shadow-xl space-y-3 backdrop-blur-sm">
              <div className="text-2xl">🛡️</div>
              <h3 className="font-bold text-sky-400 font-albion-title text-base tracking-wide uppercase">Królewska Zbrojownia</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Przeglądaj, oceniaj i twórz strategiczne zestawy rynsztunku. Filtruj buildy pod PvP Solo, ZvZ, PvE / HCE czy Ganking stworzone przez społeczność.
              </p>
            </div>

            <div className="bg-[#141419]/60 border border-[#23232c] p-6 rounded-sm shadow-xl space-y-3 backdrop-blur-sm">
              <div className="text-2xl">⚔️</div>
              <h3 className="font-bold text-emerald-400 font-albion-title text-base tracking-wide uppercase">Rejestr Gildii</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Znajdź swoją nową armię na serwerze. Sprawdzaj statusy rekrutacji polskich sojuszy i aplikuj bezpośrednio do ich struktur Discord.
              </p>
            </div>
          </div>
        </div>
      ) : (
        
        // 2. PANEL DLA ZALOGOWANYCH UŻYTKOWNIKÓW
        <div className="w-full max-w-4xl bg-[#141419] border-2 border-[#c59b27] p-8 z-10 space-y-8 shadow-2xl my-12 rounded-sm">
          <div className="flex justify-between items-center border-b border-[#23232c] pb-5">
            <div>
              <h2 className="text-2xl font-black font-albion-title text-gray-100 tracking-wide">PULPIT ZARZĄDZANIA WĘZŁEM</h2>
              <p className="text-sm text-gray-400 mt-1">Wojownik: <span className="text-[#c59b27] font-bold">{user.email}</span></p>
            </div>
            <button 
              onClick={handleLogout} 
              className="bg-red-950/60 text-red-400 border border-red-900/50 hover:bg-red-900 px-5 py-2.5 font-bold text-sm uppercase tracking-wider transition rounded-sm active:scale-95"
            >
              Opuść Węzeł
            </button>
          </div>

          {/* NAWIGACJA PO MODUŁACH APLIKACJI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold uppercase text-sm">
            <Link href="/rynek" className="p-6 bg-[#0b0b0d] border border-[#23232c] hover:border-[#c59b27] transition text-center space-y-3 block rounded-sm group">
              <div className="text-3xl group-hover:scale-110 transition duration-200">📊</div>
              <div className="text-base text-gray-200 tracking-wide">Kalkulator Rynku</div>
            </Link>
            
            <Link href="/buildy" className="p-6 bg-[#0b0b0d] border border-[#23232c] hover:border-sky-400 transition text-center space-y-3 block rounded-sm group">
              <div className="text-3xl group-hover:scale-110 transition duration-200">🛡️</div>
              <div className="text-base text-gray-200 tracking-wide">Zbrojownia Buildów</div>
            </Link>
            
            <Link href="/gildie" className="p-6 bg-[#0b0b0d] border border-[#23232c] hover:border-emerald-400 transition text-center space-y-3 block rounded-sm group">
              <div className="text-3xl group-hover:scale-110 transition duration-200">⚔️</div>
              <div className="text-base text-gray-200 tracking-wide">Rejestr Gildii</div>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}