'use client'

import dynamic from 'next/dynamic'
import { Plus, Store } from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'

const LiveMarketPriceEstimator = dynamic(() => import('./LiveMarketPriceEstimator'), {
  loading: () => <div className="min-h-24 rounded-xl border border-white/8 bg-black/20 animate-pulse" aria-label="Ładowanie wyceny rynkowej" />,
})

export default function MarketOfferForm({ user, formData, formMessage, onChange, onSubmit }) {
  const numericPrice = Number(formData.price) || 0
  const formattedPricePreview = numericPrice > 0
    ? numericPrice >= 1_000_000
      ? `${numericPrice.toLocaleString('pl-PL')} Silver (~${(numericPrice / 1_000_000).toFixed(1)}M)`
      : numericPrice >= 1_000
        ? `${numericPrice.toLocaleString('pl-PL')} Silver (~${(numericPrice / 1_000).toFixed(0)}k)`
        : `${numericPrice.toLocaleString('pl-PL')} Silver`
    : ''

  const updateField = (field, value) => onChange((current) => ({ ...current, [field]: value }))

  return (
    <div className="lg:col-span-4">
      <div className="panel sticky top-6 space-y-5 p-5 sm:p-6 relative z-30 !overflow-visible">
        <div className="border-b border-white/8 pb-4">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Twoje stoisko</p>
          <h2 className="font-display flex items-center gap-2 text-xl font-black text-[#fff]">
            <Plus className="h-4 w-4" />
            <span>Wystaw ofertę</span>
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Dodaj cenę i miejsce odbioru. Kontakt ze sprzedawcą pozostaje prywatny w portalu.</p>
        </div>

        {!user ? (
          <p className="text-xs text-gray-400 italic bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-hover)]">
            Zaloguj się na stronie głównej, aby dodawać własne oferty na rynku.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Tytuł Oferty *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs"
                placeholder="np. Sprzedam Mamuta Transportowego T8"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">ID Przedmiotu (opcjonalnie do wyceny API)</label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(event) => updateField('item_name', event.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-amber-200 focus:border-[var(--amber)] outline-none text-xs font-mono uppercase"
                placeholder="np. T8_BAG, T4_BAG, T8_MAIN_SWORD"
              />
            </div>

            {formData.item_name.trim().length >= 3 && (
              <LiveMarketPriceEstimator
                itemId={formData.item_name}
                userPrice={formData.price}
                server={formData.server}
                onSelectPrice={(value) => updateField('price', String(value))}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Cena (Silver) *</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(event) => updateField('price', event.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs font-mono"
                  placeholder="150000000"
                />
                {formattedPricePreview && <p className="mt-1 text-[10px] text-amber-300 font-mono">{formattedPricePreview}</p>}
              </div>
              <CustomSelect
                label="Kategoria"
                value={formData.category}
                onChange={(value) => updateField('category', value)}
                options={['Ekwipunek', 'Wierzchowce', 'Surowce', 'Jedzenie & Potiony', 'Inne']}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Lokalizacja / Miasto"
                value={formData.city}
                onChange={(value) => updateField('city', value)}
                options={['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien']}
              />
              <CustomSelect
                label="Serwer"
                value={formData.server}
                onChange={(value) => updateField('server', value)}
                options={['Europa', 'Ameryka', 'Azja']}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-2">
              <Store className="w-4 h-4" /> Wystaw ofertę
            </button>

            {formMessage && (
              <p className={`mt-2 text-center text-xs font-bold font-mono ${formMessage.includes('Błąd') ? 'text-rose-400' : 'text-amber-400'}`}>
                {formMessage}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
