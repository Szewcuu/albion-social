'use client'

import { useEffect, useMemo, useState } from 'react'
import { AtSign, CheckCircle2, Eye, EyeOff, KeyRound, Link2, LoaderCircle, ShieldCheck } from 'lucide-react'
import { authCallbackUrl, friendlyAuthError, validatePortalPassword } from '@/lib/authFlow'
import { portalAuth } from '@/lib/supabaseAuth'

const PROVIDERS = [
  { id: 'google', name: 'Google', mark: 'G', detail: 'Opcjonalne szybkie logowanie' },
  { id: 'discord', name: 'Discord', mark: 'D', detail: 'Wymagany przy integracjach społecznościowych' },
]

export default function ConnectedAccountsPanel() {
  const [account, setAccount] = useState({ user: null, identities: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const passwordValidation = useMemo(() => validatePortalPassword(password), [password])

  useEffect(() => {
    let active = true
    Promise.all([portalAuth.auth.getUser(), portalAuth.auth.getUserIdentities()]).then(([userResult, identityResult]) => {
      if (!active) return
      setAccount({ user: userResult.data?.user || null, identities: identityResult.data?.identities || [] })
      setLoading(false)
      const params = new URLSearchParams(window.location.search)
      const linked = params.get('linked')
      const authError = params.get('auth_error')
      if (linked) setNotice({ type: 'success', text: `Konto ${linked === 'discord' ? 'Discord' : 'Google'} zostało połączone.` })
      if (authError) setNotice({ type: 'error', text: 'Nie udało się zakończyć łączenia konta. Spróbuj ponownie.' })
    })
    return () => { active = false }
  }, [])

  const connected = (provider) => account.identities.some((identity) => identity.provider === provider)

  const linkProvider = async (provider) => {
    if (busy || connected(provider)) return
    setBusy(provider)
    setNotice(null)
    const { error } = await portalAuth.auth.linkIdentity({
      provider,
      options: { redirectTo: authCallbackUrl(`/profil?linked=${provider}`) },
    })
    if (error) {
      setNotice({ type: 'error', text: friendlyAuthError(error, `Nie udało się połączyć konta ${provider === 'discord' ? 'Discord' : 'Google'}.`) })
      setBusy('')
    }
  }

  const updatePassword = async (event) => {
    event.preventDefault()
    if (!passwordValidation.valid || password !== confirmation || busy) return
    setBusy('password')
    setNotice(null)
    const { error } = await portalAuth.auth.updateUser({ password })
    if (error) setNotice({ type: 'error', text: friendlyAuthError(error, 'Nie udało się ustawić hasła portalowego.') })
    else {
      setPassword('')
      setConfirmation('')
      setNotice({ type: 'success', text: 'Hasło portalowe zostało ustawione. Od teraz możesz logować się e-mailem i hasłem.' })
    }
    setBusy('')
  }

  return (
    <section className="panel rounded-[28px] p-5 sm:p-7" aria-labelledby="connected-accounts-title">
      <div className="flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[var(--amber)]">Bezpieczeństwo konta</p>
          <h2 id="connected-accounts-title" className="font-display mt-1 text-2xl font-black text-white">Metody logowania</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">E-mail i hasło są metodą główną. Google oraz Discord możesz dołączyć do tego samego profilu.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-[9px] font-black uppercase text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Sesja chroniona</span>
      </div>

      {notice && <div className={`mt-5 rounded-xl border p-3 text-xs ${notice.type === 'success' ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-200' : 'border-rose-400/20 bg-rose-400/8 text-rose-200'}`}>{notice.text}</div>}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="connected-account-card">
          <span className="connected-account-mark email"><AtSign /></span>
          <div><strong>E-mail portalu</strong><small>{account.user?.email || 'Brak adresu e-mail'}</small></div>
          <span className="connected-account-state connected"><CheckCircle2 /> {account.user?.email_confirmed_at ? 'Potwierdzony' : 'Oczekuje'}</span>
        </article>
        {PROVIDERS.map((provider) => {
          const isConnected = connected(provider.id)
          return <article key={provider.id} className="connected-account-card"><span className={`connected-account-mark ${provider.id}`}>{provider.mark}</span><div><strong>{provider.name}</strong><small>{provider.detail}</small></div>{loading ? <span className="connected-account-state"><LoaderCircle className="spin" /> Sprawdzanie</span> : isConnected ? <span className="connected-account-state connected"><CheckCircle2 /> Połączony</span> : <button type="button" disabled={Boolean(busy)} onClick={() => linkProvider(provider.id)} className="connected-account-connect"><Link2 /> {busy === provider.id ? 'Łączenie…' : 'Połącz'}</button>}</article>
        })}
      </div>

      <form onSubmit={updatePassword} className="account-password-form">
        <div><p className="text-xs font-black text-white">Ustaw lub zmień hasło portalowe</p><p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">Ta opcja pozwala również dotychczasowym kontom Discord logować się bezpośrednio przez e-mail.</p></div>
        <label><span>Nowe hasło</span><span className="account-password-input"><KeyRound /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 10 znaków" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
        <label><span>Powtórz hasło</span><span className="account-password-input"><KeyRound /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Powtórz hasło" /></span></label>
        <button type="submit" disabled={!passwordValidation.valid || password !== confirmation || Boolean(busy)} className="btn btn-primary min-h-11 px-4 text-[10px]">{busy === 'password' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Zapisz hasło</button>
      </form>
    </section>
  )
}
