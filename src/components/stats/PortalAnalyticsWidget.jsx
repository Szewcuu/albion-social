import { Activity, Swords, ShoppingBag, Users, Sparkles } from 'lucide-react'

export default function PortalAnalyticsWidget({ stats, loading = false }) {

  return (
    <aside className="panel tavern-ledger overflow-hidden border-amber-400/20 bg-amber-500/5" aria-label="Statystyki społeczności">
      <div className="flex items-center gap-3 border-b border-white/8 p-5">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300">
          <Activity className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">Puls społeczności</span>
          <h3 className="font-display text-xl font-bold text-white leading-tight">Tawerna w liczbach</h3>
          <p className="mt-1 text-[10px] text-gray-400 font-mono">{loading ? 'Zbieramy wieści z portalu…' : 'Aktualne podsumowanie aktywności'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/8">
        <div className="min-h-[112px] bg-[#17100c] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sky-400 text-[9px] uppercase font-bold tracking-wide">
            <Users className="w-4 h-4" /> Zweryfikowani
          </div>
          <p className="text-2xl font-black text-white">{stats.verifiedPlayers} <span className="text-[10px] font-normal text-gray-500">graczy</span></p>
        </div>

        <div className="min-h-[112px] bg-[#17100c] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-rose-400 text-[9px] uppercase font-bold tracking-wide">
            <Swords className="w-4 h-4" /> PvP Fame
          </div>
          <p className="text-2xl font-black text-rose-300">
            {stats.totalPvpFame >= 1_000_000
              ? `~${(stats.totalPvpFame / 1_000_000).toFixed(1)}M`
              : stats.totalPvpFame >= 1_000
              ? `~${(stats.totalPvpFame / 1_000).toFixed(0)}k`
              : stats.totalPvpFame.toLocaleString('pl-PL')}
          </p>
        </div>

        <div className="min-h-[112px] bg-[#17100c] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-amber-400 text-[9px] uppercase font-bold tracking-wide">
            <Sparkles className="w-4 h-4" /> Buildy
          </div>
          <p className="text-2xl font-black text-amber-300">{stats.activeBuilds} <span className="text-[10px] font-normal text-gray-500">zestawów</span></p>
        </div>

        <div className="min-h-[112px] bg-[#17100c] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-[9px] uppercase font-bold tracking-wide">
            <ShoppingBag className="w-4 h-4" /> Rynek P2P
          </div>
          <p className="text-2xl font-black text-emerald-300">{stats.activeMarketOffers} <span className="text-[10px] font-normal text-gray-500">ofert</span></p>
        </div>
      </div>
    </aside>
  )
}
