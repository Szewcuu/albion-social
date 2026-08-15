'use client'

import { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Swords, ShoppingBag, Users, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PortalAnalyticsWidget() {
  const [stats, setStats] = useState({
    verifiedPlayers: 0,
    totalPvpFame: 0,
    activeBuilds: 0,
    activeMarketOffers: 0,
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const [profilesRes, buildsRes, marketRes, pvpFameRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('builds').select('*', { count: 'exact', head: true }),
          supabase.from('market_items').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('pvp_fame'),
        ])

        const totalPvp = (pvpFameRes.data || []).reduce((sum, p) => sum + Number(p.pvp_fame || 0), 0)

        setStats({
          verifiedPlayers: profilesRes.count || 0,
          totalPvpFame: totalPvp,
          activeBuilds: buildsRes.count || 0,
          activeMarketOffers: marketRes.count || 0,
        })
      } catch {
        // Keep current stats
      }
    }

    loadStats()
  }, [])

  return (
    <div className="panel p-5 sm:p-7 space-y-5 border-amber-400/20 bg-amber-500/5">
      <div className="flex items-center justify-between border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase">
                Analityka Żywa
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Aktualizowane z serwera</span>
            </div>
            <h3 className="font-display text-lg font-black text-white mt-0.5">Statystyki Portalu Albion Polska</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-black/30 border border-white/8 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-400 text-[10px] uppercase font-bold">
            <Users className="w-3.5 h-3.5" /> Gracze w Portalu
          </div>
          <p className="text-xl font-black text-white">{stats.verifiedPlayers} <span className="text-xs font-normal text-gray-400">kont</span></p>
        </div>

        <div className="p-4 rounded-2xl bg-black/30 border border-white/8 space-y-1">
          <div className="flex items-center gap-1.5 text-rose-400 text-[10px] uppercase font-bold">
            <Swords className="w-3.5 h-3.5" /> Łączny PvP Fame
          </div>
          <p className="text-xl font-black text-rose-300">
            {stats.totalPvpFame >= 1_000_000
              ? `~${(stats.totalPvpFame / 1_000_000).toFixed(1)}M`
              : stats.totalPvpFame >= 1_000
              ? `~${(stats.totalPvpFame / 1_000).toFixed(0)}k`
              : stats.totalPvpFame.toLocaleString('pl-PL')}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-black/30 border border-white/8 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 text-[10px] uppercase font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Zbrojownia Buildów
          </div>
          <p className="text-xl font-black text-amber-300">{stats.activeBuilds} <span className="text-xs font-normal text-gray-400">zestawów</span></p>
        </div>

        <div className="p-4 rounded-2xl bg-black/30 border border-white/8 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] uppercase font-bold">
            <ShoppingBag className="w-3.5 h-3.5" /> Stragany Rynku
          </div>
          <p className="text-xl font-black text-emerald-300">{stats.activeMarketOffers} <span className="text-xs font-normal text-gray-400">ofert P2P</span></p>
        </div>
      </div>
    </div>
  )
}
