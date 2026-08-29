'use client'

import dynamic from 'next/dynamic'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, Coins, Store } from 'lucide-react'

import { usePortalSession } from '@/contexts/PortalSessionContext'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'

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
  server: 'Wszystkie serwery',
}

export default function Rynek() {
  const { user } = usePortalSession()
  const { requestConfirmation, confirmationDialog } = useConfirmDialog()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [offerScope, setOfferScope] = useState('active')
  const [offerTotal, setOfferTotal] = useState(0)
  const [offerAction, setOfferAction] = useState({ busyId: '', message: '', error: false })
  const [offerFilters, setOfferFilters] = useState({ q: '', city: '', category: '' })
  const [marketBoardReady, setMarketBoardReady] = useState(false)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [activeDeferredTool, setActiveDeferredTool] = useState('')
  const [focusOfferId, setFocusOfferId] = useState('')
  const [selectedOfferForContact, setSelectedOfferForContact] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formMessage, setFormMessage] = useState('')
  const cursorRef = useRef(null)
  const marketBoardRef = useRef(null)

  const fetchOffers = useCallback(async ({ append = false, scope = offerScope } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setLoadError('')

    try {
      const cursor = append ? cursorRef.current : null
      const params = new URLSearchParams({ scope })
      if (offerFilters.q) params.set('q', offerFilters.q)
      if (offerFilters.city) params.set('city', offerFilters.city)
      if (offerFilters.category) params.set('category', offerFilters.category)
      if (cursor) params.set('cursor', cursor)
      if (!append && focusOfferId) params.set('offer', focusOfferId)
      const response = await authenticatedFetch(`/api/market/offers?${params}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się pobrać ofert.')
      cursorRef.current = result.nextCursor || null

      startTransition(() => {
        setHasMore(result.hasMore === true)
        setOfferTotal(Number(result.total || 0))
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
  }, [focusOfferId, offerFilters, offerScope])

  useEffect(() => {
    if (!marketBoardReady) return undefined
    const timerId = window.setTimeout(fetchOffers, 0)
    return () => window.clearTimeout(timerId)
  }, [fetchOffers, marketBoardReady])

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
      if (offerScope === 'mine') await fetchOffers()
      else setOfferScope('mine')
    } catch (error) {
      setFormMessage(`Błąd: ${error.message}`)
    }
  }

  const handleRenewOffer = async (offerId) => {
    setOfferAction({ busyId: offerId, message: '', error: false })
    try {
      const response = await authenticatedFetch('/api/market/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew', id: offerId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się odnowić oferty.')
      setOfferAction({ busyId: '', message: 'Oferta jest ponownie aktywna przez 7 dni.', error: false })
      await fetchOffers()
    } catch (error) {
      setOfferAction({ busyId: '', message: error.message, error: true })
    }
  }

  const handleDeleteOffer = async (offerId) => {
    const accepted = await requestConfirmation({
      title: 'Zakończyć ofertę?',
      description: 'Oferta zniknie z aktywnego rynku. Historia istniejących rozmów pozostanie w Skrzynce handlowej.',
      confirmLabel: 'Zakończ ofertę',
    })
    if (!accepted) return
    setOfferAction({ busyId: offerId, message: '', error: false })
    try {
      const response = await authenticatedFetch('/api/market/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offerId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się usunąć oferty.')
      setOfferAction({ busyId: '', message: 'Oferta została zakończona. Rozmowy pozostały w skrzynce.', error: false })
      await fetchOffers()
    } catch (error) {
      setOfferAction({ busyId: '', message: error.message, error: true })
    }
  }

  const handleScopeChange = (scope) => {
    if (scope === offerScope) return
    cursorRef.current = null
    setOffers([])
    setLoading(true)
    setOfferScope(scope)
    setFocusOfferId('')
  }

  const handleFiltersChange = useCallback((filters) => {
    setOfferFilters((current) => {
      if (current.q === filters.q && current.city === filters.city && current.category === filters.category) return current
      cursorRef.current = null
      setOffers([])
      setLoading(true)
      return filters
    })
  }, [])

  return (
    <div className="page-content">
      {confirmationDialog}
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
          {showOfferForm ? (
            <MarketOfferForm
              user={user}
              formData={formData}
              formMessage={formMessage}
              onChange={setFormData}
              onSubmit={handleCreateOffer}
              onClose={() => setShowOfferForm(false)}
            />
          ) : (
            <section className="panel flex min-h-40 flex-col justify-center gap-4 p-5 lg:col-span-4" aria-labelledby="market-offer-launcher-title">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-400/25 bg-sky-400/8 text-sky-300">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-sky-300">Twoje stoisko</p>
                  <h2 id="market-offer-launcher-title" className="font-display text-lg font-black text-white">Chcesz coś sprzedać?</h2>
                </div>
              </div>
              <p className="text-xs leading-5 text-[var(--text-secondary)]">Najpierw pokazujemy oferty. Formularz wystawiania otworzysz wtedy, gdy będzie potrzebny.</p>
              <button type="button" onClick={() => setShowOfferForm(true)} className="btn btn-secondary btn-sm w-full">
                <Store className="h-4 w-4" /> Otwórz formularz oferty
              </button>
            </section>
          )}

          {marketBoardReady ? (
            <MarketOfferBoard
              offers={offers}
              user={user}
              loading={loading}
              loadError={loadError}
              loadingMore={loadingMore}
              hasMore={hasMore}
              total={offerTotal}
              scope={offerScope}
              actionState={offerAction}
              focusOfferId={focusOfferId}
              onLoadMore={() => fetchOffers({ append: true })}
              onRetry={() => fetchOffers()}
              onScopeChange={handleScopeChange}
              onFiltersChange={handleFiltersChange}
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
          {activeDeferredTool ? (
            <DeferredMarketTools initialTool={activeDeferredTool} />
          ) : (
            <section className="panel flex min-h-40 flex-col items-center justify-center gap-4 border-dashed p-6 text-center" aria-labelledby="market-tools-launcher-title">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Narzędzia kupca</p>
                <h2 id="market-tools-launcher-title" className="font-display mt-1 text-xl font-black text-white">Uruchom tylko potrzebną analizę</h2>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">Dane cenowe i wykresy zostaną pobrane dopiero po wybraniu narzędzia.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setActiveDeferredTool('intelligence')} className="btn btn-primary btn-sm">
                  <BarChart3 className="h-4 w-4" /> Wywiad rynkowy
                </button>
                <button type="button" onClick={() => setActiveDeferredTool('gold')} className="btn btn-secondary btn-sm">
                  <Coins className="h-4 w-4" /> Kurs złota
                </button>
              </div>
            </section>
          )}
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
