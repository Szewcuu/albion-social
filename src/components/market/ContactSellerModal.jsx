'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Send, Check, HandCoins, ShieldCheck } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

export default function ContactSellerModal({ isOpen, onClose, offer, currentUser }) {
  const [message, setMessage] = useState('')
  const [offeredPrice, setOfferedPrice] = useState(offer?.price || '')
  const [sending, setSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [sendError, setSendError] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const previousFocus = document.activeElement
    dialogRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen || !offer) return null

  const sellerName = (offer.profiles?.username || 'Sprzedawca').replace(/#0$/, '')
  const handleSubmitOffer = async (e) => {
    e.preventDefault()
    if (!currentUser) return
    setSending(true)
    setSendError('')

    try {
      const response = await authenticatedFetch('/api/market/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketItemId: offer.id,
          offeredPrice: Number(offeredPrice || offer.price),
          message,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się wysłać propozycji.')

      setConversationId(payload.conversationId)
      setSentSuccess(true)
    } catch (err) {
      console.error('Błąd powiadomienia sprzedawcy:', err)
      setSendError(err.message || 'Nie udało się wysłać propozycji.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="panel relative w-full max-w-lg rounded-2xl border border-[var(--border-warm)] p-6 shadow-2xl space-y-4 outline-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Zamknij kontakt ze sprzedawcą"
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
            <h3 id={titleId} style={{ fontFamily: 'var(--font-heading)' }} className="text-lg font-bold text-[var(--text-bright)]">
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
              Prywatny wątek ze sprzedawcą <strong>{sellerName}</strong> jest gotowy. Nikt poza Wami nie zobaczy jego treści.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={onClose} className="btn btn-ghost btn-sm">Zamknij</button>
              <Link href={`/wiadomosci?conversation=${conversationId}`} className="btn btn-primary btn-sm">Otwórz rozmowę</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitOffer} className="space-y-4 font-mono text-xs">
            <div className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-[11px] leading-5 text-emerald-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>Nie publikujemy Discorda ani innych danych kontaktowych. Rozmowa pozostaje w prywatnej skrzynce portalu.</span>
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
                    min="1"
                    max="1000000000000"
                    required
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
                  required
                  maxLength={1000}
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
