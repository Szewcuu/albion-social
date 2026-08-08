'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calculator,
  ClipboardCopy,
  Cloud,
  Coins,
  Download,
  FileCheck2,
  History,
  HandCoins,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRoundCheck,
  Users,
  WalletCards,
} from 'lucide-react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { EmptyState, StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const DRAFT_KEY = 'aopp-loot-split-draft-v2'

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function silver(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('pl-PL')} silver`
}

function parsePlayers(value) {
  const seen = new Set()
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) return false
      const key = entry.toLocaleLowerCase('pl')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export default function LootSplit() {
  const [eventName, setEventName] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [guildTaxPercent, setGuildTaxPercent] = useState('10')
  const [playerNicks, setPlayerNicks] = useState('')
  const [regearList, setRegearList] = useState([])
  const [regearNick, setRegearNick] = useState('')
  const [regearAmount, setRegearAmount] = useState('')
  const [notice, setNotice] = useState(null)
  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const [syncState, setSyncState] = useState('loading')
  const [reportHistory, setReportHistory] = useState([])
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const applyDraft = useCallback((draft) => {
    setEventName(typeof draft.eventName === 'string' ? draft.eventName : '')
    setTotalValue(typeof draft.totalValue === 'string' ? draft.totalValue : '')
    setGuildTaxPercent(typeof draft.guildTaxPercent === 'string' ? draft.guildTaxPercent : '10')
    setPlayerNicks(typeof draft.playerNicks === 'string' ? draft.playerNicks : '')
    setRegearList(Array.isArray(draft.regearList) ? draft.regearList.slice(0, 50) : [])
    setDraftSavedAt(typeof draft.savedAt === 'string' ? draft.savedAt : null)
  }, [])

  useEffect(() => {
    let active = true
    const hydrationTimer = setTimeout(async () => {
      let localDraft = null
      try {
        localDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
        if (localDraft && typeof localDraft === 'object') applyDraft(localDraft)
      } catch {
        try {
          localStorage.removeItem(DRAFT_KEY)
        } catch {
          // Pamięć lokalna może być całkowicie zablokowana przez przeglądarkę.
        }
      }

      try {
        const response = await authenticatedFetch('/api/loot-split', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Synchronizacja konta jest niedostępna.')
        if (!active) return
        setReportHistory(payload.reports || [])
        const cloudDraft = payload.draft?.payload
        const localTime = Date.parse(localDraft?.savedAt || '') || 0
        const cloudTime = Date.parse(payload.draft?.updated_at || cloudDraft?.savedAt || '') || 0
        if (cloudDraft && cloudTime > localTime) {
          applyDraft({ ...cloudDraft, savedAt: payload.draft.updated_at })
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...cloudDraft, savedAt: payload.draft.updated_at }))
        }
        setSyncState('synced')
      } catch {
        if (active) setSyncState('offline')
      }
    }, 0)
    return () => {
      active = false
      clearTimeout(hydrationTimer)
    }
  }, [applyDraft])

  const calculation = useMemo(() => {
    const totalLoot = toNumber(totalValue)
    const taxPercent = Math.min(100, Math.max(0, Number(guildTaxPercent) || 0))
    const guildTaxAmount = Math.round(totalLoot * taxPercent / 100)
    const afterTax = Math.max(0, totalLoot - guildTaxAmount)
    const players = parsePlayers(playerNicks)
    const totalRegearCost = regearList.reduce((sum, item) => sum + toNumber(item.amount), 0)
    const distributable = Math.max(0, afterTax - totalRegearCost)
    const deficit = Math.max(0, totalRegearCost - afterTax)
    const basePayout = players.length ? Math.floor(distributable / players.length) : 0
    const roundingRemainder = players.length ? distributable - (basePayout * players.length) : distributable

    const payoutRows = players.map((nick) => {
      const reimbursement = regearList
        .filter((item) => item.nick.toLocaleLowerCase('pl') === nick.toLocaleLowerCase('pl'))
        .reduce((sum, item) => sum + toNumber(item.amount), 0)
      return { nick, basePayout, reimbursement, total: basePayout + reimbursement }
    })

    const playerKeys = new Set(players.map((nick) => nick.toLocaleLowerCase('pl')))
    const unassignedRegears = regearList.filter((item) => !playerKeys.has(item.nick.toLocaleLowerCase('pl')))

    return {
      totalLoot,
      taxPercent,
      guildTaxAmount,
      afterTax,
      players,
      totalRegearCost,
      distributable,
      deficit,
      basePayout,
      roundingRemainder,
      payoutRows,
      unassignedRegears,
    }
  }, [guildTaxPercent, playerNicks, regearList, totalValue])

  function handleAddRegear(event) {
    event.preventDefault()
    const nick = regearNick.trim()
    const amount = toNumber(regearAmount)
    if (!nick || !amount || nick.length > 80 || amount > 10_000_000_000) {
      setNotice({ type: 'error', text: 'Podaj nick i prawidłową kwotę zwrotu.' })
      return
    }
    setRegearList((current) => [...current, { id: crypto.randomUUID(), nick, amount }].slice(0, 50))
    setRegearNick('')
    setRegearAmount('')
    setNotice(null)
  }

  function createDraftPayload(savedAt = new Date().toISOString()) {
    return { eventName, totalValue, guildTaxPercent, playerNicks, regearList, savedAt }
  }

  async function saveDraft() {
    const savedAt = new Date().toISOString()
    const draft = createDraftPayload(savedAt)
    try {
      const serializedDraft = JSON.stringify(draft)
      localStorage.setItem(DRAFT_KEY, serializedDraft)
      if (localStorage.getItem(DRAFT_KEY) !== serializedDraft) throw new Error('Draft verification failed')
      setDraftSavedAt(savedAt)
    } catch {
      setDraftSavedAt(null)
      setNotice({ type: 'error', text: 'Nie udało się zapisać szkicu. Sprawdź, czy przeglądarka pozwala tej stronie używać pamięci lokalnej.' })
      return
    }

    try {
      setSyncState('loading')
      const response = await authenticatedFetch('/api/loot-split', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: draft }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Synchronizacja konta nie powiodła się.')
      setDraftSavedAt(payload.savedAt || savedAt)
      setSyncState('synced')
      setNotice({ type: 'success', text: 'Szkic zapisano na koncie i w trybie offline.' })
    } catch {
      setSyncState('offline')
      setNotice({ type: 'success', text: 'Szkic zapisano lokalnie. Synchronizacja konta zostanie ponowiona przy następnym zapisie.' })
    }
  }

  async function resetDraft() {
    setEventName('')
    setTotalValue('')
    setGuildTaxPercent('10')
    setPlayerNicks('')
    setRegearList([])
    setRegearNick('')
    setRegearAmount('')
    setDraftSavedAt(null)
    setNotice(null)
    localStorage.removeItem(DRAFT_KEY)
    setResetDialogOpen(false)
    try {
      const response = await authenticatedFetch('/api/loot-split', { method: 'DELETE' })
      if (!response.ok) throw new Error()
      setSyncState('synced')
      setNotice({ type: 'success', text: 'Rozliczenie oraz szkic lokalny i zapis konta zostały wyczyszczone.' })
    } catch {
      setSyncState('offline')
      setNotice({ type: 'success', text: 'Rozliczenie wyczyszczono lokalnie. Zapis konta jest chwilowo niedostępny.' })
    }
  }

  function reportText() {
    const name = eventName.trim() || 'Rozliczenie grupy'
    const lines = [
      `**${name} — Loot Split AOPP**`,
      `Łączny łup: **${silver(calculation.totalLoot)}**`,
      `Podatek gildii (${calculation.taxPercent}%): -${silver(calculation.guildTaxAmount)}`,
      `Zwroty regear: -${silver(calculation.totalRegearCost)}`,
      `Pula równych udziałów: ${silver(calculation.distributable)}`,
      `Bazowa działka (${calculation.players.length} os.): **${silver(calculation.basePayout)}**`,
      '',
      '**Wypłaty:**',
    ]

    if (calculation.payoutRows.length) {
      calculation.payoutRows.forEach((row) => {
        lines.push(`- ${row.nick}: **${silver(row.total)}**${row.reimbursement ? ` (udział ${silver(row.basePayout)} + regear ${silver(row.reimbursement)})` : ''}`)
      })
    } else {
      lines.push('- Brak uczestników')
    }
    if (calculation.roundingRemainder > 0) lines.push(``, `Pozostałość po zaokrągleniu: ${silver(calculation.roundingRemainder)}`)
    return lines.join('\n')
  }

  async function copyReport() {
    if (!calculation.totalLoot || !calculation.players.length) {
      setNotice({ type: 'error', text: 'Uzupełnij wartość łupu i listę uczestników przed kopiowaniem.' })
      return
    }
    if (calculation.deficit > 0) {
      setNotice({ type: 'error', text: 'Pula po podatku nie pokrywa wszystkich regearów. Popraw kwoty przed raportem.' })
      return
    }
    if (calculation.unassignedRegears.length > 0) {
      setNotice({ type: 'error', text: 'Każdy regear musi być przypisany do uczestnika przed utworzeniem raportu.' })
      return
    }
    try {
      await navigator.clipboard.writeText(reportText())
      setNotice({ type: 'success', text: 'Raport został skopiowany do schowka.' })
    } catch {
      setNotice({ type: 'error', text: 'Przeglądarka nie pozwoliła skopiować raportu.' })
    }
  }

  async function saveReportVersion() {
    if (!calculation.totalLoot || !calculation.players.length || calculation.deficit > 0 || calculation.unassignedRegears.length > 0) {
      setNotice({ type: 'error', text: 'Uzupełnij poprawne rozliczenie przed zapisaniem wersji raportu.' })
      return
    }
    try {
      const response = await authenticatedFetch('/api/loot-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: createDraftPayload(), reportText: reportText() }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się zapisać raportu.')
      const report = Array.isArray(payload.report) ? payload.report[0] : payload.report
      if (report) setReportHistory((current) => [report, ...current].slice(0, 30))
      setNotice({ type: 'success', text: `Zapisano wersję ${report?.version || ''} raportu w historii konta.` })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    }
  }

  function downloadReport(text = reportText(), title = eventName || 'loot-split') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'loot-split'}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Podział Łupów</h1>
        <p>Automatyczny split srebrnych i raport dla całej drużyny.</p>
      </div>

<div className="relative z-10 mx-auto w-full max-w-[1380px] space-y-7 p-4 sm:p-6 lg:p-8">
{notice && <StatusNotice type={notice.type === 'success' ? 'success' : 'error'}>{notice.text}</StatusNotice>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="space-y-6">
            <section className="panel rounded-[28px] p-5 sm:p-7">
              <SectionTitle icon={Calculator} eyebrow="Krok 1" title="Pula i zasady podziału" description="Podatek jest potrącany pierwszy, następnie wypłacane są regeary, a pozostała pula dzielona po równo." />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Field label="Nazwa rozliczenia" value={eventName} onChange={setEventName} placeholder="np. Ava Roads 01.08" maxLength={100} />
                <Field label="Łączna wartość łupu" value={totalValue} onChange={setTotalValue} placeholder="15000000" type="number" min="0" />
                <Field label="Podatek gildii (%)" value={guildTaxPercent} onChange={setGuildTaxPercent} placeholder="10" type="number" min="0" max="100" step="0.1" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Łup brutto" value={silver(calculation.totalLoot)} icon={WalletCards} />
                <MiniMetric label="Podatek" value={`−${silver(calculation.guildTaxAmount)}`} icon={ReceiptText} tone="amber" />
                <MiniMetric label="Po podatku" value={silver(calculation.afterTax)} icon={HandCoins} tone="emerald" />
              </div>
            </section>

            <section className="panel rounded-[28px] p-5 sm:p-7">
              <SectionTitle icon={Users} eyebrow="Krok 2" title="Lista uczestników" description="Wklej nicki rozdzielone przecinkiem, średnikiem lub nową linią. Duplikaty zostaną usunięte." badge={`${calculation.players.length} graczy`} />
              <label className="mt-6 block text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Nicki graczy
                <textarea rows={6} value={playerNicks} onChange={(event) => setPlayerNicks(event.target.value)} placeholder={'Szewczykos\nHealerOne\nTankMain'} className="mt-1.5 w-full resize-y rounded-xl border px-3 py-3 font-mono text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" />
              </label>
              {calculation.players.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">{calculation.players.map((nick) => <span key={nick.toLocaleLowerCase('pl')} className="rounded-lg border border-sky-400/15 bg-sky-400/6 px-2.5 py-1.5 text-[9px] font-bold text-sky-200">{nick}</span>)}</div>
              )}
            </section>

            <section className="panel rounded-[28px] p-5 sm:p-7">
              <SectionTitle icon={ShieldAlert} eyebrow="Krok 3" title="Zwroty za sprzęt" description="Regear jest wypłacany wskazanemu graczowi ponad jego równy udział, ale finansowany z całej puli." badge={`${regearList.length} pozycji`} tone="rose" />
              <form onSubmit={handleAddRegear} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Gracz
                  {calculation.players.length ? (
                    <select value={regearNick} onChange={(event) => setRegearNick(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none"><option value="">Wybierz uczestnika</option>{calculation.players.map((nick) => <option key={nick} value={nick}>{nick}</option>)}</select>
                  ) : (
                    <input type="text" maxLength={80} value={regearNick} onChange={(event) => setRegearNick(event.target.value)} placeholder="Nick gracza" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" />
                  )}
                </label>
                <Field label="Kwota zwrotu" value={regearAmount} onChange={setRegearAmount} placeholder="250000" type="number" min="0" />
                <button type="submit" className="mt-auto flex h-[43px] items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/8 px-4 text-[10px] font-black uppercase tracking-[.12em] text-rose-200 transition hover:bg-rose-400/12"><Plus className="h-4 w-4" /> Dodaj</button>
              </form>

              <div className="mt-5 space-y-2">
                {regearList.length === 0 ? (
                  <EmptyState icon={ShieldAlert} title="Brak zwrotów" description="Cała pula po podatku trafi do równych udziałów." compact />
                ) : regearList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/12 bg-rose-400/[.035] p-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[var(--text-primary)]">{item.nick}</p><p className="mt-0.5 font-mono text-[10px] text-rose-300">+{silver(item.amount)} zwrotu</p></div><button type="button" onClick={() => setRegearList((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Usuń regear gracza ${item.nick}`} className="rounded-lg border border-rose-400/15 p-2 text-rose-300 hover:bg-rose-400/10"><Trash2 className="h-3.5 w-3.5" /></button></div>
                ))}
              </div>

              {calculation.unassignedRegears.length > 0 && <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/7 p-3 text-[10px] leading-5 text-amber-100/80"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> {calculation.unassignedRegears.length} zwrotów nie ma odpowiadającego uczestnika. Dodaj gracza do listy albo usuń zwrot.</p>}
            </section>

            <section className="panel rounded-[28px] p-5 sm:p-7">
              <SectionTitle icon={FileCheck2} eyebrow="Krok 4" title="Lista wypłat" description="Każdy gracz otrzymuje bazowy udział oraz przypisany zwrot za sprzęt." badge={`${calculation.payoutRows.length} przelewów`} tone="emerald" />
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/8">
                <div className="hidden grid-cols-[1fr_.8fr_.8fr_.8fr] gap-3 border-b border-white/8 bg-white/[.025] px-4 py-3 text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)] sm:grid"><span>Gracz</span><span>Udział</span><span>Regear</span><span>Razem</span></div>
                {calculation.payoutRows.length === 0 ? <EmptyState icon={Users} title="Lista wypłat jest pusta" description="Dodaj uczestników, aby wygenerować przelewy." className="m-4" /> : calculation.payoutRows.map((row) => (
                  <div key={row.nick.toLocaleLowerCase('pl')} className="grid gap-2 border-b border-white/6 px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_.8fr_.8fr_.8fr] sm:items-center"><p className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]"><UserRoundCheck className="h-4 w-4 text-sky-300" />{row.nick}</p><p className="text-[10px] text-[var(--text-secondary)]"><span className="mr-1 text-[var(--text-secondary)] sm:hidden">Udział:</span>{silver(row.basePayout)}</p><p className="text-[10px] text-rose-300"><span className="mr-1 text-[var(--text-secondary)] sm:hidden">Regear:</span>{row.reimbursement ? `+${silver(row.reimbursement)}` : '—'}</p><p className="font-mono text-xs font-black text-emerald-300"><span className="mr-1 text-[var(--text-secondary)] sm:hidden">Razem:</span>{silver(row.total)}</p></div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <section className="panel overflow-hidden rounded-[28px] border-[var(--amber)]/30">
              <div className="border-b border-[var(--amber)]/15 bg-[radial-gradient(circle_at_100%_0%,rgba(229,187,85,.13),transparent_60%)] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Wynik rozliczenia</p><h2 className="font-display mt-1 text-2xl font-black text-[#fff]">Księga wypłat</h2></div><Sparkles className="h-5 w-5 text-[var(--amber)]" /></div></div>
              <div className="space-y-4 p-5 sm:p-6">
                <SummaryRow label="Łup brutto" value={silver(calculation.totalLoot)} />
                <SummaryRow label={`Podatek (${calculation.taxPercent}%)`} value={`−${silver(calculation.guildTaxAmount)}`} tone="amber" />
                <SummaryRow label="Regeary" value={`−${silver(calculation.totalRegearCost)}`} tone="rose" />
                <SummaryRow label="Pula udziałów" value={silver(calculation.distributable)} tone="emerald" strong />

                {calculation.deficit > 0 && <div className="rounded-xl border border-rose-400/25 bg-rose-400/8 p-3 text-[10px] leading-5 text-rose-200"><strong>Brakuje {silver(calculation.deficit)}</strong> na pokrycie wszystkich regearów.</div>}

                <div className="rounded-2xl border border-[var(--amber)]/20 bg-black/25 p-5 text-center"><p className="text-[8px] font-black uppercase tracking-[.18em] text-[var(--text-secondary)]">Bazowa działka na gracza</p><p className="font-display mt-2 text-3xl font-black text-[var(--amber)]">{calculation.basePayout.toLocaleString('pl-PL')}</p><p className="mt-1 text-[9px] text-[var(--text-secondary)]">silver · {calculation.players.length} uczestników</p></div>

                {calculation.roundingRemainder > 0 && <p className="flex items-start gap-2 text-[9px] leading-4 text-[var(--text-secondary)]"><Coins className="mt-0.5 h-3 w-3 shrink-0 text-[var(--amber)]" /> Pozostałość po zaokrągleniu: {silver(calculation.roundingRemainder)}. Zostaje w banku rozliczenia.</p>}

                <button type="button" onClick={copyReport} disabled={!calculation.totalLoot || !calculation.players.length || calculation.deficit > 0 || calculation.unassignedRegears.length > 0} className="btn btn-primary flex w-full items-center justify-center gap-2 px-4 py-3.5 text-xs font-black uppercase tracking-[.12em] disabled:cursor-not-allowed disabled:opacity-40"><ClipboardCopy className="h-4 w-4" /> Kopiuj raport</button>
                <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={saveDraft} className="btn btn-ghost flex min-h-11 items-center justify-center gap-2 px-3 py-2.5 text-[9px] font-black uppercase tracking-[.1em]"><Save className="h-3.5 w-3.5" /> {draftSavedAt ? 'Zapisz ponownie' : 'Zapisz szkic'}</button><button type="button" onClick={saveReportVersion} className="btn btn-ghost flex min-h-11 items-center justify-center gap-2 px-3 py-2.5 text-[9px] font-black uppercase tracking-[.1em]"><History className="h-3.5 w-3.5" /> Zapisz wersję</button><button type="button" onClick={() => downloadReport()} className="btn btn-ghost flex min-h-11 items-center justify-center gap-2 px-3 py-2.5 text-[9px] font-black uppercase tracking-[.1em]"><Download className="h-3.5 w-3.5" /> Eksport TXT</button><button type="button" onClick={() => setResetDialogOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/5 px-3 py-2.5 text-[9px] font-black uppercase tracking-[.1em] text-rose-300 hover:bg-rose-400/10"><RotateCcw className="h-3.5 w-3.5" /> Wyczyść</button></div>
                <p className={`min-h-4 text-center text-[9px] ${draftSavedAt ? 'text-emerald-300' : 'text-[var(--text-secondary)]'}`} aria-live="polite">
                  {syncState === 'loading' ? 'Synchronizacja konta…' : syncState === 'offline' ? 'Tryb offline — szkic pozostaje bezpieczny na tym urządzeniu.' : draftSavedAt ? `Szkic zsynchronizowany: ${new Date(draftSavedAt).toLocaleString('pl-PL')}` : 'Szkic zostanie zapisany na koncie i lokalnie.'}
                </p>
              </div>
            </section>

            <section className="panel overflow-hidden rounded-[28px]">
              <div className="border-b border-white/8 p-5"><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-sky-300"><Cloud className="h-3.5 w-3.5" /> Historia konta</p><h2 className="font-display mt-1 text-xl font-black text-white">Wersje raportów</h2></div>
              <div className="max-h-80 space-y-2 overflow-y-auto p-4">
                {reportHistory.length === 0 ? <EmptyState icon={History} title="Brak zapisanych wersji" description="Gotowy raport możesz zachować w historii konta." compact /> : reportHistory.map((report) => <article key={report.id} className="rounded-xl border border-white/8 bg-black/15 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-xs text-white">{report.title}</strong><p className="mt-1 text-[9px] text-[var(--text-muted)]">Wersja {report.version} · {new Date(report.created_at).toLocaleString('pl-PL')}</p></div><button type="button" onClick={() => downloadReport(report.report_text, `${report.title}-v${report.version}`)} aria-label={`Pobierz ${report.title}, wersja ${report.version}`} className="rounded-lg border border-white/8 p-2 text-sky-300 hover:bg-sky-400/8"><Download className="h-3.5 w-3.5" /></button></div></article>)}
              </div>
            </section>

            <div className="rounded-2xl border border-sky-400/18 bg-sky-400/6 p-4 text-[10px] leading-5 text-sky-100/75"><p className="font-black uppercase tracking-[.14em] text-sky-300">Jak liczymy?</p><ol className="mt-2 space-y-1.5 pl-4"><li>1. Podatek od łupu brutto.</li><li>2. Zwroty za sprzęt z puli po podatku.</li><li>3. Równy podział pozostałej kwoty.</li><li>4. Regear doliczony do wypłaty właściciela.</li></ol></div>
          </aside>
        </div>
      </div>
      <ConfirmDialog
        open={resetDialogOpen}
        title="Wyczyścić rozliczenie?"
        description="Usuniemy wszystkie kwoty, uczestników, zwroty oraz szkic zapisany na tym urządzeniu. Tej operacji nie można cofnąć."
        confirmLabel="Wyczyść wszystko"
        onConfirm={resetDraft}
        onOpenChange={setResetDialogOpen}
      />
    </div>
  )
}

function SectionTitle({ icon: Icon, eyebrow, title, description, badge, tone = 'gold' }) {
  const color = tone === 'rose' ? 'text-rose-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-[var(--amber)]'
  return <div className="flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end"><div><p className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.2em] ${color}`}><Icon className="h-3.5 w-3.5" />{eyebrow}</p><h2 className="font-display mt-1 text-2xl font-black text-[#fff]">{title}</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">{description}</p></div>{badge && <span className="w-fit rounded-lg border border-white/8 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-[var(--text-secondary)]">{badge}</span>}</div>
}

function Field({ label, value, onChange, ...props }) {
  return <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" {...props} /></label>
}

function MiniMetric({ label, value, icon: Icon, tone = 'gold' }) {
  const color = tone === 'amber' ? 'text-amber-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-[var(--amber)]'
  return <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 p-3"><Icon className={`h-4 w-4 ${color}`} /><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">{label}</p><p className={`mt-0.5 truncate font-mono text-xs font-bold ${color}`}>{value}</p></div></div>
}

function SummaryRow({ label, value, tone = 'normal', strong = false }) {
  const color = tone === 'amber' ? 'text-amber-300' : tone === 'rose' ? 'text-rose-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-[var(--text-primary)]'
  return <div className={`flex items-center justify-between gap-3 border-b border-white/7 pb-3 text-xs ${strong ? 'font-black' : ''}`}><span className="text-[var(--text-secondary)]">{label}</span><span className={`font-mono font-bold ${color}`}>{value}</span></div>
}
