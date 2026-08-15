'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, LoaderCircle } from 'lucide-react'

import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { supabase } from '@/lib/supabase'

export const FOLLOWS_CHANGED_EVENT = 'aopp-entity-follows-changed'
let cachedFollows = null
let cachedUserId = null
let followsPromise = null

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nie udało się zmienić obserwowania.')
  return payload
}

async function loadFollows() {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || null
  if (cachedUserId !== userId) {
    cachedFollows = null
    followsPromise = null
    cachedUserId = userId
  }
  if (cachedFollows) return cachedFollows
  if (!followsPromise) {
    followsPromise = authenticatedFetch('/api/follows')
      .then(readJson)
      .then((payload) => {
        cachedFollows = payload.follows || []
        return cachedFollows
      })
      .finally(() => { followsPromise = null })
  }
  return followsPromise
}

function hasFollow(type, id) {
  return Boolean(cachedFollows?.some((follow) => follow.entity_type === type && follow.entity_id === String(id)))
}

export default function FollowButton({ id, name, type = 'guild', className = '', compact = false }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const refresh = () => active && setFollowing(hasFollow(type, id))

    loadFollows().then(refresh).catch(() => {
      if (active) setError('Nie udało się odczytać obserwowanych.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    window.addEventListener(FOLLOWS_CHANGED_EVENT, refresh)
    return () => {
      active = false
      window.removeEventListener(FOLLOWS_CHANGED_EVENT, refresh)
    }
  }, [id, type])

  async function toggle(event) {
    event.preventDefault()
    event.stopPropagation()
    if (busy || loading) return
    setBusy(true)
    setError('')
    try {
      const payload = await readJson(await authenticatedFetch('/api/follows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id: String(id), following: !following }),
      }))
      cachedFollows = payload.following
        ? [...(cachedFollows || []).filter((item) => !(item.entity_type === type && item.entity_id === String(id))), { entity_type: type, entity_id: String(id), label: payload.label || name || '' }]
        : (cachedFollows || []).filter((item) => !(item.entity_type === type && item.entity_id === String(id)))
      setFollowing(payload.following)
      window.dispatchEvent(new CustomEvent(FOLLOWS_CHANGED_EVENT))
    } catch (toggleError) {
      setError(toggleError.message)
    } finally {
      setBusy(false)
    }
  }

  const Icon = busy || loading ? LoaderCircle : following ? BellRing : Bell
  const label = following ? 'Obserwujesz' : 'Obserwuj'

  return (
    <span className={`inline-flex flex-col ${className}`} title={error || undefined}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy || loading}
        aria-pressed={following}
        aria-label={`${label}: ${name}`}
        className={`aopp-ghost-button inline-flex min-h-10 items-center justify-center gap-2 px-3 text-[10px] font-black transition disabled:cursor-wait disabled:opacity-55 ${following ? 'border-amber-300/35 bg-amber-300/10 text-amber-200' : ''}`}
      >
        <Icon className={`h-4 w-4 ${busy || loading ? 'animate-spin' : ''}`} />
        {!compact && label}
      </button>
      {error && !compact && <span role="status" className="mt-1 max-w-52 text-[9px] text-rose-300">{error}</span>}
    </span>
  )
}
