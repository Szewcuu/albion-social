'use client'

import {
  ChevronRight,
  Coins,
  ExternalLink,
  Fish,
  Flame,
  Globe2,
  Hammer,
  Pickaxe,
  Shield,
  Skull,
  Swords,
  Trophy,
  Users,
  Wheat,
} from 'lucide-react'

import CombatEventCard from '@/components/killboard/CombatEventCard'
import FollowButton from '@/components/ui/FollowButton'
import { summarizeLossValuations } from '@/lib/marketValuation'

const FAME_STATS = [
  { key: 'pve', label: 'PvE Fame', icon: Shield, tone: 'text-violet-300' },
  { key: 'gathering', label: 'Gathering', icon: Pickaxe, tone: 'text-emerald-300' },
  { key: 'crafting', label: 'Crafting', icon: Hammer, tone: 'text-orange-200' },
  { key: 'fishing', label: 'Fishing', icon: Fish, tone: 'text-sky-300' },
  { key: 'farming', label: 'Farming', icon: Wheat, tone: 'text-lime-300' },
]

function formatNumber(value) {
  return new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

const REGION_LABELS = {
  europe: 'Europa · EU',
  america: 'Ameryka · NA',
  asia: 'Azja · ASIA',
}

function SearchResults({ results, meta, onLoadPlayer }) {
  if (!results.length) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Wyniki wyszukiwania</p>
          <h2 className="font-display mt-1 text-xl font-black text-[#fff]">Wybierz właściwego wojownika</h2>
        </div>
        <span className="text-[10px] text-[#6f6b64]">{results.length} {results.length === 1 ? 'wynik' : 'wyników'} • {meta?.searchedAllRegions ? 'sprawdzone serwery' : 'wybrany serwer'}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {results.map((result) => {
          const ResultElement = result.externalUrl ? 'a' : 'button'
          const resultProps = result.externalUrl
            ? { href: result.externalUrl, target: '_blank', rel: 'noopener noreferrer' }
            : { type: 'button', onClick: () => onLoadPlayer(result) }

          return (
            <ResultElement key={result.id} {...resultProps} className="panel panel-interactive group flex items-center justify-between gap-4 p-4 text-left sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/8 text-rose-300"><Skull className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="font-display truncate text-lg font-black text-[#fff]">{result.name}</p>
                  <p className="truncate text-[10px] text-[var(--text-secondary)]">
                    {result.partial ? 'Sprawdź nick w zewnętrznym archiwum' : (result.guildName || 'Bez gildii')}
                    {!result.partial && result.allianceName ? ` • ${result.allianceName}` : ''}
                  </p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[.1em] text-sky-200/65">{REGION_LABELS[result.region] || result.region}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#625e57]">{result.partial ? 'Źródło' : 'Kill Fame'}</p>
                  <p className="text-xs font-bold text-rose-200">{result.partial ? 'KillBoard#1' : formatNumber(result.killFame)}</p>
                </div>
                {result.partial
                  ? <ExternalLink className="h-4 w-4 text-[#5d5952] transition group-hover:text-[var(--amber)]" />
                  : <ChevronRight className="h-4 w-4 text-[#5d5952] transition group-hover:translate-x-1 group-hover:text-[var(--amber)]" />}
              </div>
            </ResultElement>
          )
        })}
      </div>
      {meta?.warnings?.length > 0 && (
        <p className="text-[9px] leading-4 text-amber-200/70">{meta.warnings.join(' ')}</p>
      )}
    </section>
  )
}

function PlayerOverview({ overview, meta, currentRegion, region, activeHistory, onHistoryChange, onLoadPlayer }) {
  const player = overview.player
  const history = activeHistory === 'kills' ? overview.kills || [] : overview.deaths || []
  const lossSummary = summarizeLossValuations(history)
  const calculatedRatio = player.killFame / Math.max(1, player.deathFame)

  return (
    <div className="space-y-6">
      {overview.warnings?.length > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4 text-[10px] text-amber-200/75">
          {overview.warnings.join(' ')} Pozostałe dane profilu są nadal dostępne.
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-rose-400/20 bg-[radial-gradient(circle,rgba(244,63,94,.14),rgba(0,0,0,.3))] text-rose-300"><Trophy className="h-7 w-7" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-rose-300">Profil wojownika • {currentRegion?.short}</p>
              <h2 className="font-display mt-1 text-3xl font-black text-[#fff]">{player.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#8e8980]">
                <span>{player.guildName || 'Bez gildii'}</span>
                {player.allianceTag && <span className="rounded border border-[var(--amber)]/20 bg-[var(--amber)]/8 px-1.5 text-[var(--amber)]">[{player.allianceTag}]</span>}
                <span className="flex items-center gap-1"><Globe2 className="h-3 w-3" /> {currentRegion?.label}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FollowButton id={player.id} name={player.name} type="albion_player" region={region} />
            <a href={`https://albiononline.com/killboard/player/${player.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em]">
              Oficjalna kronika <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="grid gap-px bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'PvP Kill Fame', value: formatNumber(player.killFame), icon: Swords, tone: 'text-rose-300' },
            { label: 'Death Fame', value: formatNumber(player.deathFame), icon: Skull, tone: 'text-[#b6b0a7]' },
            { label: 'Fame Ratio', value: calculatedRatio.toFixed(2), icon: Flame, tone: 'text-orange-200' },
            { label: 'Śr. IP z walk', value: player.averageItemPower || '—', icon: Shield, tone: 'text-sky-300' },
          ].map((stat) => {
            const Icon = stat.icon
            return <div key={stat.label} className="bg-[#0c0e0c]/95 p-5"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.14em] text-[#6f6b64]"><Icon className={`h-3.5 w-3.5 ${stat.tone}`} /> {stat.label}</p><p className={`font-display mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p></div>
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => onHistoryChange('kills')} className={`rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.14em] transition ${activeHistory === 'kills' ? 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border border-white/8 bg-black/20 text-[var(--text-secondary)]'}`}>Zabójstwa ({overview.kills.length})</button>
              <button type="button" onClick={() => onHistoryChange('deaths')} className={`rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.14em] transition ${activeHistory === 'deaths' ? 'border border-rose-300/30 bg-rose-300/10 text-rose-200' : 'border border-white/8 bg-black/20 text-[var(--text-secondary)]'}`}>Zgony ({overview.deaths.length})</button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-[9px]">
              {lossSummary.estimatedValue > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/[.06] px-2.5 py-1.5 font-black uppercase tracking-[.08em] text-amber-200">
                  <Coins className="h-3.5 w-3.5" /> {lossSummary.hasPartialCoverage ? 'Minimum strat' : activeHistory === 'kills' ? 'Straty przeciwników' : 'Własne straty'}: {lossSummary.hasPartialCoverage ? '≥ ' : ''}{formatNumber(lossSummary.estimatedValue)} Silver
                </span>
              )}
              <span className="text-[#625e57]">Pokrycie {lossSummary.pricedItems}/{lossSummary.totalItems} slotów ({lossSummary.coveragePercent}%) · {currentRegion?.short}</span>
            </div>
          </div>

          {history.length > 0
            ? history.map((event) => <CombatEventCard key={`${event.perspective}-${event.id}`} event={event} region={region} onLoadPlayer={onLoadPlayer} />)
            : <div className="panel py-14 text-center"><Skull className="mx-auto mb-3 h-7 w-7 text-[#625e57]" /><p className="font-display text-lg font-bold text-[#bcb5aa]">Brak zapisanych zdarzeń.</p><p className="mt-1 text-[10px] text-[#666159]">Źródło nie zwróciło historii dla tej postaci.</p></div>}
        </div>

        <aside className="space-y-4">
          <section className="panel p-5">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Sława profesji</p>
            <div className="mt-4 space-y-3">
              {FAME_STATS.map((stat) => {
                const Icon = stat.icon
                return <div key={stat.key} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 p-3"><p className="flex items-center gap-2 text-[10px] font-bold text-[#918c83]"><Icon className={`h-4 w-4 ${stat.tone}`} /> {stat.label}</p><p className={`font-display font-black ${stat.tone}`}>{formatNumber(player.fame?.[stat.key])}</p></div>
              })}
            </div>
          </section>

          {overview.guild && (
            <section className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--amber)]">Gildia wojownika</p><h3 className="font-display mt-1 text-xl font-black text-[#fff]">{overview.guild.name}</h3></div>
                <Users className="h-5 w-5 text-[var(--amber)]" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-[.12em] text-[#625e57]">Członkowie</p><p className="font-display mt-1 font-black text-[#e2ddd3]">{overview.guild.memberCount}</p></div>
                <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-[.12em] text-[#625e57]">Kill Fame</p><p className="font-display mt-1 font-black text-rose-200">{formatNumber(overview.guild.killFame)}</p></div>
              </div>
              {overview.guild.topMembers.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="mb-2 text-[8px] font-black uppercase tracking-[.14em] text-[#625e57]">Najaktywniejsi PvP</p>
                  {overview.guild.topMembers.slice(0, 6).map((member) => <button type="button" key={member.id} onClick={() => onLoadPlayer(member)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[10px] text-[#9c968d] transition hover:bg-white/5 hover:text-[#fff]"><span className="truncate">{member.name}</span><span className="shrink-0 text-rose-200/70">{formatNumber(member.killFame)}</span></button>)}
                </div>
              )}
            </section>
          )}

          {meta && <p className="px-2 text-[8px] leading-4 text-[#514e49]">Walki: {meta.source}. Wycena: {overview.marketPricing?.source || 'niedostępna'} ({currentRegion?.short}). Dane cenowe pochodzą ze społecznościowych skanów; świeże do 12 h, ostrzegane po 48 h. Pobrano {new Date(meta.fetchedAt).toLocaleString('pl-PL')}.</p>}
        </aside>
      </section>
    </div>
  )
}

export default function KillboardResults(props) {
  if (props.overview?.player) return <PlayerOverview {...props} />
  return <SearchResults results={props.searchResults} meta={props.meta} onLoadPlayer={props.onLoadPlayer} />
}
