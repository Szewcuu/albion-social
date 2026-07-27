'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Coins, Calculator, Users, ShieldAlert, Copy, Check, Sparkles, RefreshCw } from 'lucide-react'

export default function LootSplit() {
  const [totalValue, setTotalValue] = useState('')
  const [guildTaxPercent, setGuildTaxPercent] = useState('10')
  const [playerNicks, setPlayerNicks] = useState('')
  
  // Koszty Regearu (dla graczy, którzy padli)
  const [regearList, setRegearList] = useState([])
  const [regearNick, setRegearNick] = useState('')
  const [regearAmount, setRegearAmount] = useState('')

  const [copied, setCopied] = useState(false)

  // Dodawanie Regearu
  const handleAddRegear = (e) => {
    e.preventDefault()
    if (!regearNick.trim() || !regearAmount || parseFloat(regearAmount) <= 0) return

    setRegearList(prev => [...prev, {
      id: Date.now(),
      nick: regearNick.trim(),
      amount: parseFloat(regearAmount)
    }])
    setRegearNick('')
    setRegearAmount('')
  }

  const handleRemoveRegear = (id) => {
    setRegearList(prev => prev.filter(item => item.id !== id))
  }

  // PRZELICZANIE LOOTA
  const totalLoot = parseFloat(totalValue) || 0
  const taxPercent = parseFloat(guildTaxPercent) || 0

  // 1. Podatek dla Gildii
  const guildTaxAmount = Math.round(totalLoot * (taxPercent / 100))
  
  // 2. Łączny koszt Regearu
  const totalRegearCost = regearList.reduce((sum, item) => sum + item.amount, 0)

  // 3. Wartość do podziału po podatku i regearach
  const remainingLoot = Math.max(0, totalLoot - guildTaxAmount - totalRegearCost)

  // 4. Lista graczy do podziału
  const playersArray = playerNicks
    .split(/[\n,]+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const playerCount = playersArray.length
  const payoutPerPlayer = playerCount > 0 ? Math.floor(remainingLoot / playerCount) : 0

  // GENEROWANIE RAPORTU TEKSTOWEGO
  const generateReportText = () => {
    let report = `⚔️ **PODSUMOWANIE LOOT SPLITA - ALBION ONLINE** ⚔️\n`
    report += `💰 **Łączny Łup:** ${totalLoot.toLocaleString('pl-PL')} Silver\n`
    if (taxPercent > 0) {
      report += `🏛️ **Podatek Gildii (${taxPercent}%):** ${guildTaxAmount.toLocaleString('pl-PL')} Silver\n`
    }
    if (regearList.length > 0) {
      report += `🛡️ **Koszty Regearu:** ${totalRegearCost.toLocaleString('pl-PL')} Silver\n`
      regearList.forEach(r => {
        report += `   • ${r.nick}: -${r.amount.toLocaleString('pl-PL')} Silver\n`
      })
    }
    report += `-----------------------------------------\n`
    report += `👑 **WYPŁATA NA GŁOWĘ (${playerCount} graczy):** ${payoutPerPlayer.toLocaleString('pl-PL')} Silver\n\n`
    if (playerCount > 0) {
      report += `👥 **Uczestnicy:** ${playersArray.join(', ')}\n`
    }
    return report
  }

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <main className="min-h-screen bg-[#050305] text-gray-300 p-4 sm:p-6 lg:p-8 relative font-sans select-none">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        
        {/* POWRÓT */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#f3ba2f] hover:text-[#fcd053] text-xs font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Centrum Caerleon</span>
          </Link>
        </div>

        {/* NAGŁÓWEK */}
        <header className="bg-[#0c0407] border border-[#2c1219] p-6 sm:p-8 rounded-3xl shadow-xl flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1c0a10] border border-[#3d1823] flex items-center justify-center text-[#f3ba2f] shrink-0 shadow-[0_0_15px_rgba(243,186,47,0.2)]">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-serif">
              Loot Splitter &amp; Regear Calculator
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Sprawiedliwy podział Silvera z PvP, Statyków i Karawan z uwzględnieniem podatku oraz zwrotu za padnięte geary.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEWA KOLUMNA: DANE DOWÓDCY */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-[#0c0407] border border-[#281017] p-6 rounded-3xl shadow-2xl space-y-5">
              <h2 className="text-sm font-black text-[#f3ba2f] uppercase tracking-wider font-serif border-b border-[#200d13] pb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Dane Zbiórki
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-gray-400 mb-1.5 uppercase font-bold">Łączna Wartość Łupu (Silver) *</label>
                  <input 
                    type="number" 
                    placeholder="np. 15000000"
                    value={totalValue}
                    onChange={e => setTotalValue(e.target.value)}
                    className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 font-bold focus:border-[#f3ba2f] outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1.5 uppercase font-bold">Podatek Gildii / Banku (%)</label>
                  <input 
                    type="number" 
                    placeholder="10"
                    value={guildTaxPercent}
                    onChange={e => setGuildTaxPercent(e.target.value)}
                    className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 font-bold focus:border-[#f3ba2f] outline-none text-sm"
                  />
                </div>
              </div>

              {/* LISTA NICKÓW GRACZY */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs font-mono">
                  <label className="text-gray-400 font-bold uppercase">Uczestnicy (Oddzieleni przecinkiem lub nową linią)</label>
                  <span className="text-[#f3ba2f] font-bold">{playerCount} graczy</span>
                </div>
                <textarea 
                  rows="4"
                  placeholder="Szewczykos, JanKowalski, Marcin123..."
                  value={playerNicks}
                  onChange={e => setPlayerNicks(e.target.value)}
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 focus:border-[#f3ba2f] outline-none text-xs resize-none font-mono"
                />
              </div>
            </div>

            {/* ZWROTY REGEARU (DLA GRACZY KTÓRZY PADLI) */}
            <div className="bg-[#0c0407] border border-[#281017] p-6 rounded-3xl shadow-2xl space-y-4">
              <h2 className="text-sm font-black text-rose-400 uppercase tracking-wider font-serif border-b border-[#200d13] pb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Zwroty za Sprzęt (Regear)
              </h2>

              <form onSubmit={handleAddRegear} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-mono">
                <input 
                  type="text" 
                  placeholder="Nick gracza"
                  value={regearNick}
                  onChange={e => setRegearNick(e.target.value)}
                  className="sm:col-span-5 bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-rose-500 outline-none"
                />
                <input 
                  type="number" 
                  placeholder="Koszt gearu (Silver)"
                  value={regearAmount}
                  onChange={e => setRegearAmount(e.target.value)}
                  className="sm:col-span-5 bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-rose-500 outline-none"
                />
                <button type="submit" className="sm:col-span-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold p-2.5 rounded-xl uppercase transition cursor-pointer">
                  + Dodaj
                </button>
              </form>

              {/* LISTA ADDOWANYCH REGEARÓW */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {regearList.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-2">Brak regearów. Cały loot po podatku idzie do podziału.</p>
                ) : (
                  regearList.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-[#050204] border border-rose-950/40 p-2.5 rounded-xl text-xs font-mono">
                      <span className="font-bold text-gray-200">{item.nick}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-rose-400 font-bold">-{item.amount.toLocaleString('pl-PL')} Silver</span>
                        <button onClick={() => handleRemoveRegear(item.id)} className="text-gray-500 hover:text-rose-400 font-bold">✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* PRAWA KOLUMNA: PODSUMOWANIE I WYLICZENIE */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0c0407] border-2 border-[#f3ba2f]/40 p-6 rounded-3xl shadow-[0_0_30px_rgba(243,186,47,0.1)] space-y-6 sticky top-6">
              
              <div className="flex items-center justify-between border-b border-[#200d13] pb-3">
                <span className="text-xs font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Wynik Kalkulacji
                </span>
                <span className="text-[10px] bg-[#1c0a10] border border-[#3d1823] text-[#f3ba2f] font-mono px-2 py-0.5 rounded font-bold">
                  Podział Live
                </span>
              </div>

              {/* PODSUMOWANIE PUNKTY */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-[#1c0b10] pb-2">
                  <span className="text-gray-400">Całkowity Łup:</span>
                  <span className="font-bold text-white">{totalLoot.toLocaleString('pl-PL')} Silver</span>
                </div>

                {taxPercent > 0 && (
                  <div className="flex justify-between border-b border-[#1c0b10] pb-2">
                    <span className="text-gray-400">Podatek Gildii ({taxPercent}%):</span>
                    <span className="font-bold text-amber-400">-{guildTaxAmount.toLocaleString('pl-PL')} Silver</span>
                  </div>
                )}

                {totalRegearCost > 0 && (
                  <div className="flex justify-between border-b border-[#1c0b10] pb-2">
                    <span className="text-gray-400">Suma Regearów:</span>
                    <span className="font-bold text-rose-400">-{totalRegearCost.toLocaleString('pl-PL')} Silver</span>
                  </div>
                )}

                <div className="flex justify-between border-b border-[#1c0b10] pb-2 pt-1">
                  <span className="text-gray-300 font-bold">Do podziału netto:</span>
                  <span className="font-bold text-emerald-400">{remainingLoot.toLocaleString('pl-PL')} Silver</span>
                </div>
              </div>

              {/* GŁÓWNY WYNIK: DZIELENIE NA GŁOWĘ */}
              <div className="bg-[#050204] border border-[#220e14] p-5 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Czysta Działka Na Gracza</span>
                <div className="text-2xl sm:text-3xl font-black text-[#f3ba2f] font-mono tracking-wide">
                  {payoutPerPlayer.toLocaleString('pl-PL')} <span className="text-xs text-gray-400 font-normal">Silver</span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono pt-1">
                  {playerCount > 0 ? `Dla każdego z ${playerCount} uczestników` : 'Wpisz uczestników powyżej'}
                </p>
              </div>

              {/* PRZYCISK KOPIOWANIA RAPORTU */}
              <button 
                onClick={handleCopyReport}
                disabled={totalLoot <= 0}
                className="w-full bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {copied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Skopiowano Raport!' : 'Kopiuj Raport dla Ekipy'}</span>
              </button>

            </div>
          </div>

        </div>

      </div>
    </main>
  )
}