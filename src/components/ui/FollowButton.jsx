'use client'

import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { isFollowingItem, toggleFollowItem } from '@/lib/followSystem'

export default function FollowButton({ id, name, type = 'guild', className = '' }) {
  const followKey = `${type}:${id || ''}`
  const [followState, setFollowState] = useState({ key: '', value: false })
  const following = followState.key === followKey && followState.value

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFollowState({
        key: followKey,
        value: Boolean(id && isFollowingItem(id, type)),
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [followKey, id, type])

  const handleToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const nextState = toggleFollowItem({ id, name, type })
    setFollowState({ key: followKey, value: nextState })
  }

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
        following
          ? 'bg-amber-400/20 border border-amber-400 text-amber-300 shadow-sm'
          : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
      } ${className}`}
      title={following ? `Obserwujesz: ${name}` : `Zaobserwuj: ${name}`}
    >
      {following ? (
        <>
          <Check className="w-3.5 h-3.5 text-amber-400" />
          <span>Obserwujesz</span>
        </>
      ) : (
        <>
          <Bell className="w-3.5 h-3.5 text-gray-400" />
          <span>Obserwuj</span>
        </>
      )}
    </button>
  )
}
