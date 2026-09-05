'use client'

import dynamic from 'next/dynamic'
import { Plus, Store, X } from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'
import ItemPicker from '@/components/builds/ItemPicker'
import { LoadingState } from '@/components/ui/FeedbackState'

const LiveMarketPriceEstimator = dynamic(() => import('./LiveMarketPriceEstimator'), {
  loading: () => <LoadingState label="Ładowanie wyceny rynkowej…" compact />,
})

export default function MarketOfferForm({ user, formData, formMessage, onChange, onSubmit, onClose }) {
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
        <div className="relative border-b border-white/8 pb-4 pr-12">
          <button type="button" onClick={onClose} aria-label="Zamknij formularz oferty" className="btn-icon absolute right-0 top-0">
            <X className="h-4 w-4" />
          </button>
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

            <ItemPicker
              label="Przedmiot do wyceny (opcjonalnie)"
              value={formData.item_name}
              onChange={(value) => updateField('item_name', value)}
            />

            {formData.item_name.trim().length >= 3 && formData.server === 'Wszystkie serwery' && (
              <p className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3 text-[10px] leading-4 text-sky-100">
                Wybierz konkretny serwer, jeśli chcesz porównać cenę z Albion Data Project. Sama oferta nadal może dotyczyć wszystkich serwerów.
              </p>
            )}

            {formData.item_name.trim().length >= 3 && formData.server !== 'Wszystkie serwery' && (
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
                options={['Wszystkie serwery', 'Europa', 'Ameryka', 'Azja']}
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
