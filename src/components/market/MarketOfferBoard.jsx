'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Clock,
  ExternalLink,
  Globe,
  HandCoins,
  MapPin,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  User,
} from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'
import FavoriteButton from '@/components/ui/FavoriteButton'
import FollowButton from '@/components/ui/FollowButton'
import { isMarketOfferExpired, marketOfferDaysRemaining } from '@/lib/marketOffers'

export default function MarketOfferBoard({
  offers,
  user,
  loading,
  loadError,
  loadingMore,
  hasMore,
  total,
  scope,
  actionState,
  focusOfferId,
  onLoadMore,
  onRetry,
  onScopeChange,
  onFiltersChange,
  onRenew,
  onDelete,
  onContact,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const deferredSearchTerm = useDeferredValue(searchTerm)

  useEffect(() => {
    onFiltersChange({
      q: deferredSearchTerm.trim(),
      city: filterCity === 'ALL' ? '' : filterCity,
      category: filterCategory === 'ALL' ? '' : filterCategory,
    })
  }, [deferredSearchTerm, filterCategory, filterCity, onFiltersChange])

  const filteredOffers = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase()

    return offers
      .filter((offer) => {
        const matchesSearch = !normalizedSearch
          || (offer.title || '').toLowerCase().includes(normalizedSearch)
          || (offer.item_name || '').toLowerCase().includes(normalizedSearch)
        const matchesCity = filterCity === 'ALL' || offer.city === filterCity
        const matchesCategory = filterCategory === 'ALL' || offer.category === filterCategory
        return matchesSearch && matchesCity && matchesCategory
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
        if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [deferredSearchTerm, filterCategory, filterCity, offers, sortBy])

  useEffect(() => {
    if (loading || !focusOfferId) return
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(`offer-${focusOfferId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [focusOfferId, loading])

  return (
    <div className="lg:col-span-8 space-y-4">
      <div className="panel space-y-4 p-5 relative z-30 !overflow-visible">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Tablica ogłoszeń</p>
            <h2 className="font-display text-lg font-black text-[#fff]">Znajdź właściwy towar</h2>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">{total} {total === 1 ? 'oferta' : 'ofert'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-black/15 p-1" role="group" aria-label="Zakres ofert rynku">
          <button type="button" onClick={() => onScopeChange('active')} aria-pressed={scope === 'active'} className={`min-h-10 rounded-lg px-3 text-[10px] font-black uppercase tracking-[.12em] transition ${scope === 'active' ? 'bg-amber-400 text-black' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'}`}>Aktywne oferty</button>
          <button type="button" onClick={() => onScopeChange('mine')} aria-pressed={scope === 'mine'} className={`min-h-10 rounded-lg px-3 text-[10px] font-black uppercase tracking-[.12em] transition ${scope === 'mine' ? 'bg-amber-400 text-black' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'}`}>Moje ogłoszenia</button>
        </div>

        {actionState?.message && (
          <div role={actionState.error ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2 text-xs ${actionState.error ? 'border-rose-400/25 bg-rose-400/8 text-rose-200' : 'border-emerald-400/25 bg-emerald-400/8 text-emerald-100'}`}>
            {actionState.message}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Szukaj przedmiotów na rynku..."
            className="input-with-icon !pl-12 w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl py-2.5 pr-4 text-xs text-gray-100 focus:border-[var(--amber)] outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CustomSelect
            label="Miasto"
            value={filterCity}
            onChange={setFilterCity}
            options={[
              { value: 'ALL', label: 'Wszystkie Miasta' },
              'Caerleon',
              'Bridgewatch',
              'Fort Sterling',
              'Lymhurst',
              'Martlock',
              'Thetford',
              'Brecilien',
            ]}
          />
          <CustomSelect
            label="Kategoria"
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: 'ALL', label: 'Wszystkie Kategorie' },
              'Ekwipunek',
              'Wierzchowce',
              'Surowce',
              'Jedzenie & Potiony',
              'Inne',
            ]}
          />
          <CustomSelect
            label="Sortowanie"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'newest', label: 'Najnowsze' },
              { value: 'price_asc', label: 'Cena: Najniższa (wczytane)' },
              { value: 'price_desc', label: 'Cena: Najwyższa (wczytane)' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-12 text-gray-500 font-mono animate-pulse">Pobieranie ofert z rynku...</p>
        ) : loadError ? (
          <div className="panel border-rose-500/25 py-12 text-center">
            <ShoppingBag className="mx-auto mb-4 h-8 w-8 text-rose-300/70" />
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">Tablica rynku chwilowo nie odpowiada.</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{loadError}</p>
            <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-5"><RefreshCw className="h-3.5 w-3.5" /> Spróbuj ponownie</button>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="panel py-14 text-center">
            <ShoppingBag className="mx-auto mb-4 h-8 w-8 text-sky-300/70" />
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">{scope === 'mine' ? 'Nie masz jeszcze własnych ogłoszeń.' : 'Brak aktywnych ofert.'}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{scope === 'mine' ? 'Wystaw ofertę, aby pojawiła się w tym archiwum.' : 'Zmień filtry albo zajrzyj ponownie później.'}</p>
          </div>
        ) : (
          filteredOffers.map((offer) => {
            const isOwner = user?.id === offer.user_id
            const cleanItemName = (offer.item_name || '').trim().toUpperCase()
            const daysRemaining = marketOfferDaysRemaining(offer.created_at)
            const isExpired = isMarketOfferExpired(offer.created_at)
            const isBusy = actionState?.busyId === offer.id

            return (
              <article
                key={offer.id}
                id={`offer-${offer.id}`}
                className={`panel p-5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isExpired ? 'opacity-70 border-rose-500/20' : 'hover:border-[var(--amber-muted)]'}`}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '280px' }}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="h-16 w-16 rounded-2xl bg-black/40 border border-white/10 p-2 flex items-center justify-center shrink-0 relative overflow-hidden">
                    {cleanItemName.length >= 3 ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/item-image?id=${encodeURIComponent(cleanItemName)}`}
                        alt={offer.title}
                        width="48"
                        height="48"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className="h-12 w-12 object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                          if (event.currentTarget.nextElementSibling) event.currentTarget.nextElementSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className="h-full w-full flex items-center justify-center text-amber-400" style={{ display: cleanItemName.length >= 3 ? 'none' : 'flex' }}>
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 font-mono text-[10px] flex-wrap">
                      <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">{offer.category || 'Przedmiot'}</span>
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> {offer.city}</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><Globe className="w-3 h-3" /> {offer.server || 'Wszystkie serwery'}</span>
                      {isExpired ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3 text-rose-400" /> Wygasła</span>
                      ) : (
                        <span className="bg-amber-400/10 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> Ważna: {daysRemaining}d</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl font-black leading-tight text-[#fff]">{offer.title}</h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <FavoriteButton id={offer.id} title={offer.title} type="market" />
                        {!isOwner && <FollowButton id={offer.id} name={offer.title} type="market" compact />}
                      </div>
                    </div>

                    <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
                      <span>Sprzedawca:</span>
                      <Link
                        href={`/profil/${offer.user_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 hover:text-white hover:bg-amber-500/35 hover:border-amber-400 hover:scale-[1.03] transition cursor-pointer font-bold text-xs normal-case shadow-[0_0_15px_rgba(245,158,11,0.15)] group"
                        title="Kliknij, aby otworzyć publiczny profil i karty przygód gracza"
                      >
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:text-amber-200 transition" />
                        <span className="underline underline-offset-2 decoration-amber-400/40 group-hover:decoration-amber-300">{(offer.profiles?.username || 'Gracz').replace(/#0$/, '')}</span>
                        <ExternalLink className="w-3 h-3 text-amber-400/80 group-hover:text-amber-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
                      </Link>
                    </div>
                    <p className="text-xs text-emerald-300/80 font-mono">Kontakt chroniony przez prywatną skrzynkę portalu</p>
                  </div>
                </div>

                <div className="flex w-full items-end justify-between gap-3 border-t border-white/8 pt-4 sm:w-auto sm:min-w-[190px] sm:flex-col sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-gray-500 block uppercase">Cena</span>
                    <span className="font-display text-2xl font-black text-[var(--amber)]">
                      {Number(offer.price).toLocaleString('pl-PL')} <span className="text-xs font-normal text-gray-400">Silver</span>
                    </span>
                  </div>

                  {isOwner ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRenew(offer.id)}
                        disabled={isBusy}
                        className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-300 p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                        title="Odśwież ważność oferty na kolejne 7 dni"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isBusy ? 'animate-spin' : ''}`} /> Odnów (7d)
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(offer.id)}
                        disabled={isBusy}
                        className="bg-rose-950/80 hover:bg-rose-900 border border-rose-900/60 text-rose-300 p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Zakończ
                      </button>
                    </div>
                  ) : isExpired ? (
                    <span className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-[10px] font-bold uppercase text-rose-200">Oferta wygasła</span>
                  ) : (
                    <button type="button" onClick={() => onContact(offer)} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                      <HandCoins className="w-3.5 h-3.5 text-[var(--gold)]" /> Napisz do sprzedawcy
                    </button>
                  )}
                </div>
              </article>
            )
          })
        )}

        {!loading && hasMore && (
          <button type="button" disabled={loadingMore} onClick={onLoadMore} className="btn btn-secondary mx-auto flex items-center">
            {loadingMore ? 'Wczytywanie…' : 'Wczytaj kolejne oferty'}
          </button>
        )}
      </div>
    </div>
  )
}
