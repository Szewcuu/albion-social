'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, X, LoaderCircle } from 'lucide-react'
import { portalAuth } from '@/lib/supabaseAuth'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const CONFIRMATION = 'USUŃ KONTO'

export default function AccountDeletionModal({ isOpen, onClose }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleClose = () => {
    if (deleting) return
    setConfirmText('')
    setError('')
    onClose()
  }

  const handleDelete = async () => {
    if (confirmText !== CONFIRMATION) {
      setError('Wpisz dokładnie frazę "USUŃ KONTO" aby zatwierdzić.')
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await authenticatedFetch('/api/profile/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmText }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.deleted) {
        throw new Error(payload.error || 'Nie udało się trwale usunąć konta.')
      }

      await portalAuth.auth.signOut({ scope: 'local' })
      window.localStorage.clear()
      window.location.replace('/')
    } catch (err) {
      setError(err.message || 'Błąd podczas usuwania konta.')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="panel w-full max-w-md space-y-5 p-6 relative border-rose-500/40 shadow-2xl">
        
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-black text-white">Usuwanie Konta & Danych RODO</h3>
          </div>
          <button onClick={handleClose} disabled={deleting} className="p-1 text-gray-400 hover:text-white transition disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-gray-300 leading-relaxed font-sans">
          <p className="font-bold text-rose-300">
            ⚠️ Uwaga: Opcja trwałego usunięcia konta jest nieodwracalna.
          </p>
          <p>
            Po kliknięciu przycisku Twój profil, wpisy na forum, opublikowane oferty rynkowe oraz powiązane dane osobowe zostaną trwale usunięte z bazy danych portalu zgodnie z dyrektywą RODO.
          </p>

          <div className="space-y-1.5 pt-2">
            <label className="block text-[10px] font-mono font-bold uppercase text-gray-400">
              Wpisz <span className="text-rose-400">USUŃ KONTO</span> aby potwierdzić:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="USUŃ KONTO"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-3 text-xs text-white outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {error && (
            <p className="text-rose-400 font-mono text-[11px] bg-rose-500/10 p-2 rounded-lg border border-rose-500/30">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleClose} disabled={deleting} className="btn btn-ghost btn-sm flex-1 disabled:opacity-40">
            Anuluj
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || confirmText !== CONFIRMATION}
            className="btn btn-sm bg-rose-600 hover:bg-rose-500 text-white font-bold flex-1 flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {deleting ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Trwale usuń konto
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
