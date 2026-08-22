'use client'

import dynamic from 'next/dynamic'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

import { usePortalSession } from '@/contexts/PortalSessionContext'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const MarketOfferForm = dynamic(() => import('@/components/market/MarketOfferForm'), {
  ssr: false,
  loading: () => <div className="panel min-h-[620px] animate-pulse lg:col-span-4" aria-label="Ładowanie stoiska" />,
})
const MarketOfferBoard = dynamic(() => import('@/components/market/MarketOfferBoard'), {
  ssr: false,
  loading: () => <div className="panel min-h-72 animate-pulse lg:col-span-8" aria-label="Ładowanie tablicy ofert" />,
})
const ContactSellerModal = dynamic(() => import('@/components/market/ContactSellerModal'))
const DeferredMarketTools = dynamic(() => import('@/components/market/DeferredMarketTools'), {
  loading: () => <div className="panel min-h-40 animate-pulse" aria-label="Ładowanie narzędzi rynku" />,
})

const EMPTY_FORM = {
  title: '',
  item_name: '',
  price: '',
  city: 'Caerleon',
  category: 'Ekwipunek',
  server: 'Europa',
}

export default function Rynek() {
  const { user } = usePortalSession()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [marketBoardReady, setMarketBoardReady] = useState(false)
  const [focusOfferId, setFocusOfferId] = useState('')
  const [selectedOfferForContact, setSelectedOfferForContact] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formMessage, setFormMessage] = useState('')
  const cursorRef = useRef(null)
  const marketBoardRef = useRef(null)

  const fetchOffers = useCallback(async ({ append = false } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setLoadError('')

    try {
      const cursor = append ? cursorRef.current : null
      const response = await authenticatedFetch(`/api/market/offers${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się pobrać ofert.')
      cursorRef.current = result.nextCursor || null

      startTransition(() => {
        setHasMore(result.hasMore === true)
        setOffers((current) => append
          ? [...current, ...(result.offers || []).filter((row) => !current.some((item) => item.id === row.id))]
          : (result.offers || []))
        if (append) setLoadingMore(false)
        else setLoading(false)
      })
    } catch (error) {
      console.error('Błąd pobierania ofert rynku:', error)
      setLoadError('Nie udało się pobrać ofert. Odśwież tablicę i spróbuj ponownie.')
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(fetchOffers, 0)
    return () => window.clearTimeout(timerId)
  }, [fetchOffers])

  useEffect(() => {
    const offerId = new URLSearchParams(window.location.search).get('offer') || ''
    if (offerId) {
      const timerId = window.setTimeout(() => {
        setFocusOfferId(offerId)
        setMarketBoardReady(true)
      }, 0)
      return () => window.clearTimeout(timerId)
    }

    const target = marketBoardRef.current
    if (!target || typeof window.IntersectionObserver !== 'function') {
      setMarketBoardReady(true)
      return undefined
    }

    const observer = new window.IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setMarketBoardReady(true)
      observer.disconnect()
    }, { rootMargin: '0px 0px 80px', threshold: 0.01 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const handleCreateOffer = async (event) => {
    event.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany!')
      return
    }
    if (!formData.title.trim() || !formData.price) {
      setFormMessage('Uzupełnij wymagane pola!')
      return
    }

    try {
      const response = await authenticatedFetch('/api/market/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się wystawić oferty.')
      setFormMessage('Oferta została wystawiona na rynku!')
      setFormData(EMPTY_FORM)
      fetchOffers()
    } catch (error) {
      setFormMessage(`Błąd: ${error.message}`)
    }
  }

  const handleRenewOffer = async (offerId) => {
    try {
      const response = await authenticatedFetch('/api/market/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew', id: offerId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się odnowić oferty.')
      setFormMessage('Ważność oferty została odnowiona na 7 dni.')
      fetchOffers()
    } catch (error) {
      setFormMessage(`Błąd: ${error.message}`)
    }
  }

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę ofertę z rynku?')) return
    try {
      const response = await authenticatedFetch('/api/market/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offerId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się usunąć oferty.')
      setFormMessage('Oferta została usunięta.')
      fetchOffers()
    } catch (error) {
      setFormMessage(`Błąd: ${error.message}`)
    }
  }

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Rynek P2P</h1>
        <p>Przeglądaj i publikuj ogłoszenia handlowe w wybranym mieście Albionu.</p>
      </div>

      <div className="relative z-10 mx-auto mt-2 w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="mt-4 flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Ogłoszenia społeczności</p>
            <h2 className="font-display mt-1 text-2xl font-black text-[#fff]">Rynek ofert P2P</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">Oferty wystawiają gracze portalu. Nie są automatycznie powiązane z cenami skanowanymi przez Albion Online Data Project.</p>
          </div>
          <span className="w-fit rounded-lg border border-sky-400/20 bg-sky-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-sky-300">Kontakt i odbiór w grze</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <MarketOfferForm
            user={user}
            formData={formData}
            formMessage={formMessage}
            onChange={setFormData}
            onSubmit={handleCreateOffer}
          />

          {marketBoardReady ? (
            <MarketOfferBoard
              offers={offers}
              user={user}
              loading={loading}
              loadError={loadError}
              loadingMore={loadingMore}
              hasMore={hasMore}
              focusOfferId={focusOfferId}
              onLoadMore={() => fetchOffers({ append: true })}
              onRenew={handleRenewOffer}
              onDelete={handleDeleteOffer}
              onContact={setSelectedOfferForContact}
            />
          ) : (
            <div ref={marketBoardRef} className="panel min-h-72 lg:col-span-8 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-display text-lg font-bold text-[var(--text-primary)]">Tablica ofert jest gotowa</p>
              <p className="max-w-md text-xs leading-5 text-[var(--text-secondary)]">Zostanie otwarta automatycznie, gdy dojdziesz do sekcji ogłoszeń.</p>
              <button type="button" onClick={() => setMarketBoardReady(true)} className="btn btn-secondary btn-sm">Pokaż oferty teraz</button>
            </div>
          )}
        </div>

        <div style={{ contentVisibility: 'auto', containIntrinsicSize: '420px' }}>
          <DeferredMarketTools />
        </div>
      </div>

      {selectedOfferForContact && (
        <ContactSellerModal
          key={selectedOfferForContact.id}
          isOpen
          onClose={() => setSelectedOfferForContact(null)}
          offer={selectedOfferForContact}
          currentUser={user}
        />
      )}
    </div>
  )
}
