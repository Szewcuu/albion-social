'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, X, Send, Shield, Award, User } from 'lucide-react'

export default function GuildApplyModal({ isOpen, onClose, guild, currentUser }) {
  const [formData, setFormData] = useState({
    ingameNick: '',
    totalFame: '',
    mainRole: 'Tank',
    message: '',
  })
  const [status, setStatus] = useState({ loading: false, success: false, error: null })

  // Automatyczne podpowiadanie nicku zalogowanego użytkownika
  useEffect(() => {
    if (currentUser) {
      const defaultNick = 
        currentUser.user_metadata?.custom_claims?.global_name || 
        currentUser.user_metadata?.full_name || 
        currentUser.user_metadata?.name || ''
      
      setFormData(prev => ({ ...prev, ingameNick: defaultNick }))
    }
  }, [currentUser])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, success: false, error: null })

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          guildId: guild?.id,
          guildName: guild?.name,
          guildOwnerId: guild?.user_id, // Wymagane do powiadomień Realtime na portalu
          webhookUrl: guild?.webhook_url, // Webhook podpięty do danej gildii
          userDiscord: 
            currentUser?.user_metadata?.custom_claims?.global_name || 
            currentUser?.user_metadata?.full_name || 
            currentUser?.email || 
            'Niezalogowany',
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Błąd wysyłania')

      setStatus({ loading: false, success: true, error: null })
      setTimeout(() => {
        onClose()
        setStatus({ loading: false, success: false, error: null })
      }, 2000)
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.message })
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 will-change-transform backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg bg-[#140c0e] border-2 border-[#c59b27] p-6 shadow-[0_0_40px_rgba(197,155,39,0.2)] relative text-gray-200 transform-gpu rounded-2xl"
        >
          {/* Przycisk Zamknięcia */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-[#2b181a]"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Nagłówek */}
          <div className="flex items-center gap-3 border-b border-[#2b181a] pb-4 mb-4">
            <Swords className="w-7 h-7 text-[#c59b27]" />
            <div>
              <h3 className="text-xl font-black font-serif text-[#c59b27] uppercase tracking-wide">
                Aplikacja do: {guild?.name}
              </h3>
              <p className="text-xs text-gray-400 font-mono">Wypełnij zgłoszenie rekrutacyjne</p>
            </div>
          </div>

          {status.success ? (
            <div className="py-8 text-center space-y-2">
              <span className="text-4xl animate-bounce inline-block">⚔️</span>
              <p className="text-emerald-400 font-bold text-lg font-serif">Aplikacja została wysłana!</p>
              <p className="text-xs text-gray-400 font-mono">
                Lider oraz rekruterzy gildii otrzymali powiadomienie.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-sm font-sans">
              {/* Nick w grze */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1 font-mono uppercase">
                  <User className="w-3.5 h-3.5 text-[#c59b27]" /> Nick w Albion Online *
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. SirLancelot"
                  value={formData.ingameNick}
                  onChange={(e) => setFormData({ ...formData, ingameNick: e.target.value })}
                  className="w-full bg-[#0b0708] border border-[#3a2023] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none rounded-xl"
                />
              </div>

              {/* Sława / Fame */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1 font-mono uppercase">
                  <Award className="w-3.5 h-3.5 text-[#c59b27]" /> Całkowita Sława (PvP + PvE) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. 50M / 150M"
                  value={formData.totalFame}
                  onChange={(e) => setFormData({ ...formData, totalFame: e.target.value })}
                  className="w-full bg-[#0b0708] border border-[#3a2023] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none rounded-xl"
                />
              </div>

              {/* Rola */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1 font-mono uppercase">
                  <Shield className="w-3.5 h-3.5 text-[#c59b27]" /> Główna rola ZvZ / PvP *
                </label>
                <select
                  value={formData.mainRole}
                  onChange={(e) => setFormData({ ...formData, mainRole: e.target.value })}
                  className="w-full bg-[#0b0708] border border-[#3a2023] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none rounded-xl cursor-pointer"
                >
                  <option value="Tank">Tank / Inicjator</option>
                  <option value="Healer">Healer (Niewidzialność / Światłość)</option>
                  <option value="Bruiser">Bruiser (MDPS)</option>
                  <option value="RDPS">RDPS (Zasięgowe DPS)</option>
                  <option value="Support">Support / Arcane / Curse</option>
                  <option value="Ganker / BattleMount">Ganker / Mount Bitewny</option>
                </select>
              </div>

              {/* Wiadomość */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 font-mono uppercase">
                  Wiadomość do Rekruterów (Opcjonalnie)
                </label>
                <textarea
                  rows="3"
                  placeholder="Napisz coś o swoim doświadczeniu lub dlaczego chcesz dołączyć..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#0b0708] border border-[#3a2023] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none resize-none rounded-xl"
                />
              </div>

              {status.error && (
                <p className="text-xs text-rose-400 font-bold font-mono bg-rose-950/40 p-2 border border-rose-900/50 rounded-lg">{status.error}</p>
              )}

              {/* Przycisk Wysyłania */}
              <button
                type="submit"
                disabled={status.loading}
                className="w-full bg-gradient-to-r from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] text-black font-extrabold py-3.5 uppercase tracking-widest flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-lg rounded-xl text-xs font-serif"
              >
                <Send className="w-4 h-4" />
                <span>{status.loading ? 'Wysyłanie...' : 'Wyślij Aplikację'}</span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}