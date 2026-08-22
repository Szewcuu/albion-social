'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Check, Share2, ThumbsUp } from 'lucide-react'

import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { portalAuth } from '@/lib/supabaseAuth'
import FollowButton from '@/components/ui/FollowButton'

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nie udało się wykonać operacji.')
  return payload
}

export default function BuildSocialActions({ buildId, ownerId, initialVotes = 0 }) {
  const [user, setUser] = useState(null)
  const [votes, setVotes] = useState(initialVotes)
  const [userVote, setUserVote] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data: { session } } = await portalAuth.auth.getSession()
      if (!active) return
      setUser(session?.user || null)

      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined
      const response = await fetch(`/api/builds/${buildId}/social`, { headers })
      const payload = await readJson(response)
      if (!active) return
      setVotes(payload.votes)
      setUserVote(payload.userVote)
      setFavorite(payload.favorite)
    }

    load().catch(() => {
      if (active) setMessage('Nie udało się odświeżyć interakcji społecznościowych.')
    })

    const { data: { subscription } } = portalAuth.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user || null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [buildId])

  const requireLogin = () => {
    if (user) return true
    setMessage('Zaloguj się przez Discord, aby głosować i zapisywać buildy.')
    return false
  }

  const toggleVote = async () => {
    if (!requireLogin() || busy) return
    setBusy('vote')
    setMessage('')
    try {
      const payload = await readJson(await authenticatedFetch(`/api/builds/${buildId}/social`, {
        method: 'PUT',
      }))
      setVotes(payload.votes)
      setUserVote(payload.userVote)
      setMessage(payload.userVote ? 'Build polubiony.' : 'Polubienie usunięte.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(null)
    }
  }

  const toggleFavorite = async () => {
    if (!requireLogin() || busy) return
    setBusy('favorite')
    setMessage('')
    try {
      const payload = await readJson(await authenticatedFetch(`/api/builds/${buildId}/social`, {
        method: 'POST',
      }))
      setFavorite(payload.favorite)
      setMessage(payload.favorite ? 'Build zapisany w ulubionych.' : 'Build usunięty z ulubionych.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(null)
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      if (error.name !== 'AbortError') setMessage('Nie udało się udostępnić linku.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={userVote}
          onClick={toggleVote}
          disabled={Boolean(busy)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition disabled:cursor-wait disabled:opacity-60 ${userVote
            ? 'border-amber-300/50 bg-amber-300 text-[#180b04]'
            : 'border-amber-300/25 bg-amber-300/8 text-amber-200 hover:border-amber-300/45 hover:bg-amber-300/12'
          }`}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {userVote ? 'Lubisz' : 'Polub'}
          <span className="rounded-md bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">{votes}</span>
        </button>

        {user?.id !== ownerId && <FollowButton id={buildId} name="ten build" type="build" />}

        <button
          type="button"
          aria-pressed={favorite}
          onClick={toggleFavorite}
          disabled={Boolean(busy)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition disabled:cursor-wait disabled:opacity-60 ${favorite
            ? 'border-orange-300/45 bg-orange-300/15 text-orange-100'
            : 'border-white/10 bg-white/[.035] text-[#c9c3b8] hover:border-orange-300/30 hover:text-orange-100'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} aria-hidden="true" />
          {favorite ? 'W ulubionych' : 'Zapisz build'}
        </button>

        <button
          type="button"
          onClick={share}
          className="aopp-ghost-button inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-xs font-black"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
          {copied ? 'Skopiowano' : 'Udostępnij'}
        </button>
      </div>

      {message && (
        <p role="status" aria-live="polite" className="text-[11px] leading-5 text-[#aaa49a]">
          {message}
        </p>
      )}
    </div>
  )
}
