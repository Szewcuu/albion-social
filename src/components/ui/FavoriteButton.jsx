'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { isItemFavorite, toggleFavoriteItem } from '@/lib/favoriteSystem'

export default function FavoriteButton({ id, title, type = 'build', className = '' }) {
  const favoriteKey = `${type}:${id || ''}`
  const [favoriteState, setFavoriteState] = useState({ key: '', value: false })
  const isFav = favoriteState.key === favoriteKey && favoriteState.value

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFavoriteState({
        key: favoriteKey,
        value: Boolean(id && isItemFavorite(id, type)),
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [favoriteKey, id, type])

  const handleToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const nextState = toggleFavoriteItem({ id, title, type })
    setFavoriteState({ key: favoriteKey, value: nextState })
  }

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-xl transition border cursor-pointer ${
        isFav
          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
          : 'bg-white/5 border-white/10 text-gray-400 hover:text-amber-300 hover:bg-white/10'
      } ${className}`}
      title={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
    >
      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
    </button>
  )
}
