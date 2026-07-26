'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Save, Share2, Plus, Trash2, Check, AlertCircle,
  Swords, Video, Package, Zap, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import PageBanner from '@/components/PageBanner'
import EquipmentGrid from '@/components/builds/EquipmentGrid'
import TagSelector from '@/components/builds/TagSelector'
import ItemPicker from '@/components/builds/ItemPicker'
import {
  createEmptyBuild, buildToDbPayload, decodeBuildFromUrl, encodeBuildToUrl, EQUIPMENT_SLOTS,
} from '@/lib/buildSlots'

function DynamicList({ items, onChange, placeholder, max = 5 }) {
  const add = () => {
    if (items.length < max) onChange([...items, ''])
  }
  const update = (idx, val) => {
    const next = [...items]
    next[idx] = val
    onChange(next)
  }
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-xs text-gray-100 outline-none focus:border-[#f3ba2f]"
          />
          <button type="button" onClick={() => remove(idx)} className="text-rose-400 hover:text-rose-300 p-2">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-[10px] font-mono text-[#f3ba2f] uppercase hover:text-[#fcd053]">
          <Plus className="w-3.5 h-3.5" /> Dodaj
        </button>
      )}
    </div>
  )
}

function ValidationPanel({ errors }) {
  if (errors.length === 0) return null
  return (
    <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase">
        <AlertCircle className="w-4 h-4" />
        {errors.length} {errors.length === 1 ? 'problem' : 'problemy'} do rozwiązania
      </div>
      <ul className="space-y-1">
        {errors.map((err, i) => (
          <li key={i} className="text-[11px] text-rose-300/80 font-mono">• {err}</li>
        ))}
      </ul>
    </div>
  )
}

export default function CreateBuildPage() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [build, setBuild] = useState(createEmptyBuild())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  useEffect(() => {
    const encoded = searchParams.get('build')
    if (encoded) {
      const loaded = decodeBuildFromUrl(encoded)
      if (loaded) setBuild(prev => ({ ...prev, ...loaded }))
    }
  }, [searchParams])

  const updateBuild = useCallback((patch) => {
    setBuild(prev => ({ ...prev, ...patch }))
    setSaved(false)
  }, [])

  const updateSlot = (key, data) => {
    setBuild(prev => ({
      ...prev,
      slots: { ...prev.slots, [key]: data },
    }))
    setSaved(false)
  }

  const validate = () => {
    const errs = []
    if (!build.title.trim()) errs.push('Nazwa buildu jest wymagana')
    if (build.tags.locations.length === 0) errs.push('Wybierz co najmniej jedną lokalizację')
    if (build.tags.zones.length === 0) errs.push('Wybierz co najmniej jedną strefę')
    if (build.tags.sizes.length === 0) errs.push('Wybierz wielkość grupy')
    if (build.tags.roles.length === 0) errs.push('Wybierz rolę')
    if (build.tags.activities.length === 0) errs.push('Wybierz aktywność')
    if (!build.budget) errs.push('Wybierz tag budżetu')
    const hasItem = Object.values(build.slots).some(s => s?.main)
    if (!hasItem) errs.push('Wybierz co najmniej jeden przedmiot')
    setErrors(errs)
    return errs.length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    if (!user) {
      setErrors(['Musisz być zalogowany, aby opublikować build'])
      return
    }

    setSaving(true)
    const payload = buildToDbPayload(build, user.id)

    let { error } = await supabase.from('builds').insert([payload])

    if (error?.message?.includes('build_data')) {
      const { build_data, ...corePayload } = payload
      const fallback = await supabase.from('builds').insert([corePayload])
      error = fallback.error
    }

    setSaving(false)
    if (error) {
      setErrors([`Błąd zapisu: ${error.message}`])
    } else {
      setSaved(true)
      setErrors([])
    }
  }

  const handleShare = async () => {
    const url = encodeBuildToUrl(build)
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      prompt('Skopiuj link:', url)
    }
  }

  const addInventoryItem = () => {
    if (build.inventory.length < 10) {
      updateBuild({ inventory: [...build.inventory, { id: '', amount: 1 }] })
    }
  }

  const addSkillCombo = () => {
    if (build.skillCombos.length < 5) {
      updateBuild({ skillCombos: [...build.skillCombos, { name: '', description: '' }] })
    }
  }

  const addYoutube = () => {
    if (build.youtubeVideos.length < 3) {
      updateBuild({ youtubeVideos: [...build.youtubeVideos, ''] })
    }
  }

  return (
    <main className="min-h-screen flex flex-col antialiased font-sans relative bg-[#050305] text-gray-300">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none" />
      <div className="fixed inset-0 opacity-10 bg-[radial-gradient(#f3ba2f_1px,transparent_1px)] [background-size:24px_24px] z-0 pointer-events-none" />

      <div className="w-full flex-1 flex flex-col items-center p-4 sm:p-6 lg:p-8 z-10 max-w-[1400px] mx-auto space-y-6">

        <div className="w-full flex flex-wrap justify-between items-center gap-3">
          <Link href="/buildy" className="inline-flex items-center gap-2 text-[#f3ba2f] hover:text-[#fcd053] text-xs font-mono font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Powrót do Zbrojowni
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] text-gray-300 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition"
            >
              {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              {shareCopied ? 'Skopiowano!' : 'Udostępnij link'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black px-5 py-2 rounded-xl text-xs font-extrabold uppercase transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Zapisywanie...' : saved ? 'Opublikowano!' : 'Opublikuj build'}
            </button>
          </div>
        </div>

        <PageBanner
          title="Kreator Buildów"
          subtitle="Stwórz, dostosuj i udostępnij swój idealny zestaw bojowy"
          icon={Swords}
        />

        {!user && (
          <div className="w-full bg-amber-950/20 border border-amber-900/40 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-bold text-amber-400 uppercase">Logowanie wymagane do publikacji</p>
              <p className="text-[11px] text-gray-400 mt-1">Możesz tworzyć i udostępniać linki bez konta. Aby opublikować build w zbrojowni, zaloguj się przez Discord na stronie głównej.</p>
            </div>
          </div>
        )}

        <ValidationPanel errors={errors} />

        <div className="w-full grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

          <div className="space-y-6">

            <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider">Informacje ogólne</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Nazwa buildu *</label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="np. Hellgate Healer T8"
                    value={build.title}
                    onChange={(e) => updateBuild({ title: e.target.value })}
                    className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 text-xs focus:border-[#f3ba2f] outline-none"
                  />
                  <span className="text-[9px] text-gray-600 font-mono">{build.title.length}/100</span>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Autor (opcjonalnie)</label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Twoja nazwa gracza"
                    value={build.authorName}
                    onChange={(e) => updateBuild({ authorName: e.target.value })}
                    className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 text-xs focus:border-[#f3ba2f] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Opis / Taktyka</label>
                <textarea
                  rows={4}
                  placeholder="Opisz jak grać tym buildem, rotację skilli, wskazówki..."
                  value={build.description}
                  onChange={(e) => updateBuild({ description: e.target.value })}
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 text-xs focus:border-[#f3ba2f] outline-none resize-y"
                />
              </div>
            </section>

            <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6">
              <h2 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider mb-4">Tagi buildu</h2>
              <TagSelector
                tags={build.tags}
                budget={build.budget}
                onTagsChange={(tags) => updateBuild({ tags })}
                onBudgetChange={(budget) => updateBuild({ budget })}
              />
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-5 space-y-3">
                <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" /> Mocne strony
                </h3>
                <DynamicList
                  items={build.strengths}
                  onChange={(strengths) => updateBuild({ strengths })}
                  placeholder="np. Wysoki sustain w walce"
                  max={5}
                />
              </section>
              <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-5 space-y-3">
                <h3 className="text-xs font-mono font-bold text-rose-400 uppercase flex items-center gap-1.5">
                  <ThumbsDown className="w-3.5 h-3.5" /> Słabe strony
                </h3>
                <DynamicList
                  items={build.weaknesses}
                  onChange={(weaknesses) => updateBuild({ weaknesses })}
                  placeholder="np. Słaby vs. bursty DPS"
                  max={5}
                />
              </section>
            </div>

            <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider">Alternatywne przedmioty</h2>
              <p className="text-[10px] text-gray-500 font-mono">Dodaj do 2 alternatyw na slot (np. tańszy wariant)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EQUIPMENT_SLOTS.filter(s => !s.hasAmount).map((slot) => (
                  <div key={slot.key} className="bg-[#050204] border border-[#200d13] rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">{slot.label}</span>
                    <div className="flex gap-2">
                      {[0, 1].map((altIdx) => (
                        <div key={altIdx} className="flex-1">
                          <ItemPicker
                            label={`Alt ${altIdx + 1}`}
                            category={slot.category}
                            value={build.slots[slot.key]?.alternatives?.[altIdx] || ''}
                            onChange={(id) => {
                              const alts = [...(build.slots[slot.key]?.alternatives || ['', ''])]
                              alts[altIdx] = id
                              updateSlot(slot.key, { ...build.slots[slot.key], alternatives: alts })
                            }}
                            compact
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 space-y-3">
              <h2 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4" /> Combo skilli ({build.skillCombos.length}/5)
              </h2>
              {build.skillCombos.map((combo, idx) => (
                <div key={idx} className="bg-[#050204] border border-[#200d13] rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nazwa combo (np. Burst opener)"
                      value={combo.name}
                      onChange={(e) => {
                        const next = [...build.skillCombos]
                        next[idx] = { ...combo, name: e.target.value }
                        updateBuild({ skillCombos: next })
                      }}
                      className="flex-1 bg-[#0c0407] border border-[#220e14] rounded-lg p-2 text-xs text-gray-100 outline-none focus:border-[#f3ba2f]"
                    />
                    <button type="button" onClick={() => updateBuild({ skillCombos: build.skillCombos.filter((_, i) => i !== idx) })} className="text-rose-400 p-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Q → W → E → R"
                    value={combo.description}
                    onChange={(e) => {
                      const next = [...build.skillCombos]
                      next[idx] = { ...combo, description: e.target.value }
                      updateBuild({ skillCombos: next })
                    }}
                    className="w-full bg-[#0c0407] border border-[#220e14] rounded-lg p-2 text-xs text-gray-100 outline-none focus:border-[#f3ba2f]"
                  />
                </div>
              ))}
              {build.skillCombos.length < 5 && (
                <button type="button" onClick={addSkillCombo} className="flex items-center gap-1.5 text-[10px] font-mono text-[#f3ba2f] uppercase">
                  <Plus className="w-3.5 h-3.5" /> Dodaj combo
                </button>
              )}
            </section>

            <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 space-y-3">
              <h2 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4" /> Ekwipunek zapasowy ({build.inventory.length}/10)
              </h2>
              {build.inventory.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <ItemPicker
                      label="Przedmiot"
                      category={null}
                      value={item.id}
                      onChange={(id) => {
                        const next = [...build.inventory]
                        next[idx] = { ...item, id }
                        updateBuild({ inventory: next })
                      }}
                      compact
                    />
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={item.amount}
                    onChange={(e) => {
                      const next = [...build.inventory]
                      next[idx] = { ...item, amount: parseInt(e.target.value) || 1 }
                      updateBuild({ inventory: next })
                    }}
                    className="w-16 bg-[#050204] border border-[#220e14] rounded-lg text-center text-xs py-2"
                  />
                  <button type="button" onClick={() => updateBuild({ inventory: build.inventory.filter((_, i) => i !== idx) })} className="text-rose-400 p-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {build.inventory.length < 10 && (
                <button type="button" onClick={addInventoryItem} className="flex items-center gap-1.5 text-[10px] font-mono text-[#f3ba2f] uppercase">
                  <Plus className="w-3.5 h-3.5" /> Dodaj przedmiot
                </button>
              )}
            </section>

            <section className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 space-y-3">
              <h2 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4" /> Filmy YouTube ({build.youtubeVideos.length}/3)
              </h2>
              <p className="text-[10px] text-gray-500 font-mono">youtube.com/watch, youtu.be, youtube.com/shorts</p>
              {build.youtubeVideos.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => {
                      const next = [...build.youtubeVideos]
                      next[idx] = e.target.value
                      updateBuild({ youtubeVideos: next })
                    }}
                    className="flex-1 bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-xs text-gray-100 outline-none focus:border-[#f3ba2f]"
                  />
                  <button type="button" onClick={() => updateBuild({ youtubeVideos: build.youtubeVideos.filter((_, i) => i !== idx) })} className="text-rose-400 p-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {build.youtubeVideos.length < 3 && (
                <button type="button" onClick={addYoutube} className="flex items-center gap-1.5 text-[10px] font-mono text-[#f3ba2f] uppercase">
                  <Plus className="w-3.5 h-3.5" /> Dodaj film
                </button>
              )}
            </section>
          </div>

          <div className="xl:sticky xl:top-6 xl:self-start space-y-4">
            <EquipmentGrid slots={build.slots} onSlotChange={updateSlot} />

            <div className="bg-[#0c0407] border border-[#281017] rounded-2xl p-4 space-y-2">
              <h3 className="text-[10px] font-mono font-bold text-gray-400 uppercase">Jak używać</h3>
              <ol className="text-[10px] text-gray-500 font-mono space-y-1.5 list-decimal list-inside">
                <li>Kliknij slot w siatce, aby wybrać przedmiot</li>
                <li>Uzupełnij tagi i opis taktyki</li>
                <li>Użyj Udostępnij, aby skopiować link</li>
                <li>Opublikuj build w zbrojowni (wymaga logowania)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full bg-[#030102] border-t border-[#200d13] py-6 text-center text-xs text-gray-500 mt-12 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska Portal</span>.</p>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <Link href="/regulamin" className="hover:text-[#f3ba2f] transition">Regulamin</Link>
            <span>•</span>
            <Link href="/prywatnosc" className="hover:text-[#f3ba2f] transition">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
