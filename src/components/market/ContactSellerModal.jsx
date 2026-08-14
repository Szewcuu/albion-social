'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Send, Check, Copy, MessageSquare, HandCoins, ShieldCheck } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

export default function ContactSellerModal({ isOpen, onClose, offer, currentUser }) {
  const [message, setMessage] = useState('')
  const [offeredPrice, setOfferedPrice] = useState(offer?.price || '')
  const [sending, setSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [copiedWhisper, setCopiedWhisper] = useState(false)
  const [sendError, setSendError] = useState('')

  if (!isOpen || !offer) return null

  const sellerName = (offer.profiles?.username || 'Sprzedawca').replace(/#0$/, '')
  const ingameWhisperCommand = `/w ${sellerName} Cześć! Piszę z portalu Albion Polska ws. oferty "${offer.title}".`

  const handleCopyWhisper = () => {
    navigator.clipboard.writeText(ingameWhisperCommand)
    setCopiedWhisper(true)
    setTimeout(() => setCopiedWhisper(false), 3000)
  }

  const handleSubmitOffer = async (e) => {
    e.preventDefault()
    if (!currentUser) return
    setSending(true)
    setSendError('')

    try {
      const response = await authenticatedFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'market_offer',
          offerId: offer.id,
          offeredPrice: Number(offeredPrice || offer.price),
          message,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się wysłać propozycji.')

      setSentSuccess(true)
    } catch (err) {
      console.error('Błąd powiadomienia sprzedawcy:', err)
      setSendError(err.message || 'Nie udało się wysłać propozycji.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="panel relative w-full max-w-lg rounded-2xl border border-[var(--border-warm)] p-6 shadow-2xl space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-bright)] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold-glow)] border border-[var(--border-warm)] flex items-center justify-center text-[var(--gold)]">
            <HandCoins className="w-5 h-5" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)' }} className="text-lg font-bold text-[var(--text-bright)]">
              Kontakt ze sprzedawcą
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Przedmiot: <strong className="text-[var(--gold-bright)]">{offer.title}</strong> ({Number(offer.price).toLocaleString('pl-PL')} Silver)
            </p>
          </div>
        </div>

        {sentSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--forest)]/20 border border-[var(--forest)] text-[var(--forest)] mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 style={{ fontFamily: 'var(--font-heading)' }} className="text-base font-bold text-[var(--text-bright)]">
              Wiadomość wysłana!
            </h4>
            <p className="text-xs text-[var(--text-body)] max-w-md mx-auto leading-relaxed">
              Sprzedawca <strong>{sellerName}</strong> otrzymał powiadomienie w portalu i odpowie Ci na czacie.
            </p>
            <button onClick={onClose} className="btn btn-primary btn-sm mt-2">
              Zamknij okno
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitOffer} className="space-y-4 font-mono text-xs">
            {/* Direct In-game whisper copy box */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-stone)] space-y-2">
              <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] uppercase font-bold">
                <span>Komenda w grze (Whisper)</span>
                <span className="text-[var(--gold)]">Szybki kontakt</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-bright)] overflow-x-auto">
                <code>{ingameWhisperCommand}</code>
              </div>
              <button
                type="button"
                onClick={handleCopyWhisper}
                className="btn btn-ghost btn-sm w-full text-[10px] flex items-center justify-center gap-1.5"
              >
                {copiedWhisper ? <Check className="w-3.5 h-3.5 text-[var(--forest)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWhisper ? 'Skopiowano komendę!' : 'Kopiuj komendę do gry'}</span>
              </button>
            </div>

            {/* In-portal Offer Message Form */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                    Cena w ogłoszeniu
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${Number(offer.price).toLocaleString('pl-PL')} Silver`}
                    className="w-full opacity-60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--gold)] mb-1">
                    Twoja propozycja (Silver)
                  </label>
                  <input
                    type="number"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value)}
                    placeholder={offer.price}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Wiadomość do sprzedawcy
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="np. Cześć! Mogę odebrać przedmiot w Bridgewatch po 20:00."
                  className="w-full resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
                  Anuluj
                </button>
                <button type="submit" disabled={sending} className="btn btn-primary btn-sm">
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? 'Wysyłanie...' : 'Wyślij ofertę w portalu'}</span>
                </button>
              </div>
              {sendError && <p className="rounded-lg border border-rose-400/25 bg-rose-400/8 p-2 text-rose-300">{sendError}</p>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
