'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Shield, Swords, Zap, Castle, Compass, AlertCircle } from 'lucide-react'

// Konfiguracja głównych stref czasowych Prime Time w Albion EU (UTC)
const PRIME_TIMES = [
  { time: '12:00', label: 'Prime Time - Azja / Wczesna Europa' },
  { time: '15:00', label: 'Prime Time - Wschodnia Europa' },
  { time: '18:00', label: 'Główny Prime Time EU (Zamki & Terki)' },
  { time: '21:00', label: 'Późny Prime Time EU / ZvZ' },
  { time: '00:00', label: 'Prime Time Ameryka' }
]

export default function TimeryPage() {
  const [utcTime, setUtcTime] = useState(new Date())
  const [selectedServer, setSelectedServer] = useState('Europa')

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Obliczanie czasu do najbliższego wskazanego Prime Time (w UTC)
  const getTimeRemaining = (targetHour) => {
    const now = new Date(utcTime)
    const target = new Date(now)
    target.setUTCHours(targetHour, 0, 0, 0)

    if (now > target) {
      target.setUTCDate(target.getUTCDate() + 1)
    }

    const diff = target - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return {
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      totalSeconds: diff / 1000
    }
  }

  // Obliczanie timera dla Vortex / Core (co 1 godzinę na przełomie)
  const getNextVortexTime = () => {
    const now = new Date(utcTime)
    const next = new Date(now)
    next.setUTCHours(now.getUTCHours() + 1, 0, 0, 0)

    const diff = next - now
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <main className="min-h-screen bg-[#050305] text-gray-300 p-4 sm:p-6 lg:p-8 relative font-sans select-none">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* POWRÓT */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#f3ba2f] hover:text-[#fcd053] text-xs font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Centrum Caerleon</span>
          </Link>
        </div>

        {/* NAGŁÓWEK Z ZEGAREM SERVERA */}
        <header className="bg-[#0c0407] border border-[#2c1219] p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#1c0a10] border border-[#3d1823] flex items-center justify-center text-[#f3ba2f] shrink-0 shadow-[0_0_15px_rgba(243,186,47,0.2)]">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-serif">
                Timery Czarnych Stref &amp; ZvZ
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Licznik wydarzeń strategicznych, zamków, terytoriów oraz rdzeni energii (Power Cores)
              </p>
            </div>
          </div>

          <div className="bg-[#050204] border border-[#220e14] px-6 py-4 rounded-2xl text-center space-y-1 shadow-inner">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Aktualny Czas UTC</span>
            <div className="text-2xl sm:text-3xl font-black text-[#f3ba2f] font-mono tracking-wider">
              {utcTime.toLocaleTimeString('pl-PL', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </header>

        {/* SIATKA TIMERÓW EVENTOWYCH */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CARD 1: POWER CORES & VORTEX */}
          <div className="bg-[#0c0407] border border-[#281017] p-5 rounded-3xl shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-[#200d13] pb-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-2">
                <Zap className="w-4 h-4" /> Power Cores / Vortex
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            </div>
            <p className="text-xs text-gray-400 leading-snug">Sprawny resp rdzeni energii i orbi na Rubieżach (Outlands).</p>
            <div className="bg-[#050204] border border-[#220e14] p-4 rounded-2xl text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Następna Faza Respów za</span>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                {getNextVortexTime()}
              </div>
            </div>
          </div>

          {/* CARD 2: ZAMKI I POSTERUNKI */}
          <div className="bg-[#0c0407] border border-[#281017] p-5 rounded-3xl shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#200d13] pb-3">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase flex items-center gap-2">
                <Castle className="w-4 h-4" /> Skrzynie Zamkowe
              </span>
              <span className="text-[10px] bg-purple-950 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-800/40">Co 6h</span>
            </div>
            <p className="text-xs text-gray-400 leading-snug">Otwarcie skrzyń w Zamkach i Posterunkach (Castle Outposts).</p>
            <div className="bg-[#050204] border border-[#220e14] p-4 rounded-2xl text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Główny Resp (18:00 UTC) za</span>
              <div className="text-2xl font-black text-purple-300 font-mono mt-1">
                {getTimeRemaining(18).formatted}
              </div>
            </div>
          </div>

          {/* CARD 3: RESET TERYTORIÓW */}
          <div className="bg-[#0c0407] border border-[#281017] p-5 rounded-3xl shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#200d13] pb-3">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase flex items-center gap-2">
                <Shield className="w-4 h-4" /> Walce Terytorialne (ZvZ)
              </span>
              <span className="text-[10px] bg-rose-950 text-rose-300 font-mono px-2 py-0.5 rounded border border-rose-800/40">Prime Time</span>
            </div>
            <p className="text-xs text-gray-400 leading-snug">Okienko ataku terytorialnego i walk gilidyjnych na EU.</p>
            <div className="bg-[#050204] border border-[#220e14] p-4 rounded-2xl text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Start Okienka (18:00 UTC) za</span>
              <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                {getTimeRemaining(18).formatted}
              </div>
            </div>
          </div>

        </div>

        {/* HARMONOGRAM STREF PRIME TIME */}
        <div className="bg-[#0c0407] border border-[#281017] p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#200d13] pb-4">
            <h2 className="text-base font-black text-[#f3ba2f] uppercase tracking-wider font-serif flex items-center gap-2">
              <Compass className="w-5 h-5" /> Harmonogram Prime Time&apos;ów (Albion EU)
            </h2>
            <span className="text-xs font-mono text-gray-400">Czas w formacie UTC</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
            {PRIME_TIMES.map((pt, idx) => {
              const hour = parseInt(pt.time.split(':')[0])
              const remaining = getTimeRemaining(hour)
              const isClose = remaining.totalSeconds <= 3600 // poniżej 1h

              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                    isClose 
                      ? 'bg-[#1a0c0a] border-rose-900/60 shadow-[0_0_15px_rgba(225,29,72,0.15)]' 
                      : 'bg-[#050204] border border-[#220e14]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-lg font-black text-white">{pt.time} UTC</span>
                    {isClose && (
                      <span className="bg-rose-950 text-rose-300 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-800/50 uppercase flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Blisko!
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 leading-tight">{pt.label}</p>

                  <div className="pt-2 border-t border-[#1c0b10] flex justify-between items-center text-[10px]">
                    <span className="text-gray-500">Odliczanie:</span>
                    <span className={`font-bold font-mono ${isClose ? 'text-rose-400' : 'text-[#f3ba2f]'}`}>
                      {remaining.formatted}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </main>
  )
}
