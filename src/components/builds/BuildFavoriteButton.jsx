'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'

import { authenticatedFetch } from '@/lib/authenticatedFetch'

export default function BuildFavoriteButton({ buildId, title, initialFavorite = false }) {
  const [favorite, setFavorite] = useState(initialFavorite)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const toggleFavorite = async () => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const response = await authenticatedFetch(`/api/builds/${buildId}/social`, { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się zmienić ulubionych.')
      setFavorite(payload.favorite === true)
    } catch (error) {
      setMessage(error.message || 'Nie udało się zmienić ulubionych.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`${favorite ? 'Usuń z ulubionych' : 'Zapisz w ulubionych'}: ${title}`}
        aria-pressed={favorite}
        disabled={busy}
        onClick={toggleFavorite}
        className={`btn-icon transition disabled:cursor-wait disabled:opacity-60 ${favorite ? 'text-orange-200' : 'text-[var(--text-muted)] hover:text-orange-200'}`}
        title={favorite ? 'Usuń z ulubionych' : 'Zapisz w ulubionych'}
      >
        <Bookmark className={`h-3.5 w-3.5 ${favorite ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>
      {message && (
        <span role="status" className="sr-only">{message}</span>
      )}
    </span>
  )
}
