'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AtSign, Check, Compass, Eye, EyeOff, Flame, KeyRound, LoaderCircle, MailCheck, Shield, UserRoundPlus } from 'lucide-react'
import { usePortalSession } from '@/contexts/PortalSessionContext'
import { authCallbackUrl, friendlyAuthError, validatePortalPassword } from '@/lib/authFlow'
import { portalAuth } from '@/lib/supabaseAuth'

const AUTH_MODES = {
  login: { eyebrow: 'Brama do kompanii', title: 'Witaj ponownie', description: 'E-mail i hasło są główną metodą dostępu do portalu.' },
  register: { eyebrow: 'Nowy zapis w kronice', title: 'Załóż konto', description: 'Utwórz konto portalu. Discord możesz bezpiecznie połączyć później.' },
  recovery: { eyebrow: 'Odzyskanie dostępu', title: 'Przywróć hasło', description: 'Wyślemy bezpieczny link do ustawienia nowego hasła.' },
}

function PasswordRequirements({ password }) {
  const { checks } = validatePortalPassword(password)
  const rows = [['length', 'co najmniej 10 znaków'], ['letter', 'litera'], ['number', 'cyfra'], ['special', 'znak specjalny']]
  return <div className="auth-password-rules" aria-label="Wymagania hasła">{rows.map(([key, label]) => <span key={key} className={checks[key] ? 'valid' : ''}><Check aria-hidden="true" /> {label}</span>)}</div>
}

export default function GuestGateway() {
  const { loginWithOAuth } = usePortalSession()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmation: '' })
  const [busy, setBusy] = useState('')
  const [authError, setAuthError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const config = AUTH_MODES[mode]

  useEffect(() => {
    const errorCode = new URLSearchParams(window.location.search).get('auth_error')
    if (!errorCode) return
    const message = errorCode === 'provider'
      ? 'Logowanie zewnętrzne zostało anulowane albo odrzucone. Możesz spróbować ponownie.'
      : 'Nie udało się zakończyć logowania. Spróbuj ponownie lub wróć za chwilę.'
    const timer = window.setTimeout(() => setAuthError(message), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const canSubmit = useMemo(() => {
    if (!form.email.trim()) return false
    if (mode === 'recovery') return true
    if (!form.password) return false
    if (mode === 'register') return form.name.trim().length >= 2 && form.password === form.confirmation && validatePortalPassword(form.password).valid
    return true
  }, [form, mode])

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setAuthError('')
    setSuccess('')
    setBusy('')
  }

  const handleCredentials = async (event) => {
    event.preventDefault()
    if (!canSubmit || busy) return
    setBusy(mode)
    setAuthError('')
    setSuccess('')

    try {
      const email = form.email.trim().toLowerCase()
      if (mode === 'login') {
        const { error } = await portalAuth.auth.signInWithPassword({ email, password: form.password })
        if (error) throw error
        return
      }

      if (mode === 'register') {
        const { data, error } = await portalAuth.auth.signUp({
          email,
          password: form.password,
          options: {
            emailRedirectTo: authCallbackUrl('/'),
            data: { name: form.name.trim(), full_name: form.name.trim() },
          },
        })
        if (error) throw error
        if (!data.session) setSuccess(`Wysłaliśmy link potwierdzający na ${email}. Otwórz go, aby aktywować konto.`)
        return
      }

      const { error } = await portalAuth.auth.resetPasswordForEmail(email, { redirectTo: authCallbackUrl('/auth/nowe-haslo') })
      if (error) throw error
      setSuccess('Jeżeli konto z tym adresem istnieje, wysłaliśmy link do ustawienia nowego hasła.')
    } catch (error) {
      setAuthError(friendlyAuthError(error))
    } finally {
      setBusy('')
    }
  }

  const startOAuth = async (provider) => {
    if (busy) return
    setBusy(provider)
    setAuthError('')
    try {
      await loginWithOAuth(provider)
    } catch (error) {
      setAuthError(friendlyAuthError(error, `Nie udało się rozpocząć logowania przez ${provider === 'google' ? 'Google' : 'Discord'}.`))
      setBusy('')
    }
  }

  const resendConfirmation = async () => {
    const email = form.email.trim().toLowerCase()
    if (!email || busy) return
    setBusy('resend')
    setAuthError('')
    const { error } = await portalAuth.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authCallbackUrl('/') } })
    if (error) setAuthError(friendlyAuthError(error, 'Nie udało się ponownie wysłać wiadomości.'))
    else setSuccess(`Ponownie wysłaliśmy wiadomość aktywacyjną na ${email}.`)
    setBusy('')
  }

  return (
    <div className="guest-home">
      <section className="guest-welcome" aria-labelledby="welcome-title">
        <div className="welcome-hero-art" aria-hidden="true" />
        <div className="welcome-hero-vignette" aria-hidden="true" />
        <div className="guest-welcome-copy">
          <Image className="welcome-crest" src="/logo-256.webp" alt="Herb Albion Polska" width={88} height={88} loading="eager" />
          <div className="welcome-kicker"><Flame aria-hidden="true" /> Polska społeczność · wszystkie serwery Albionu</div>
          <h1 id="welcome-title">Twoja historia<br /><em>zaczyna się tutaj.</em></h1>
          <p>Polskie forum i baza wypadowa dla graczy Albion Online. Jedno konto łączy rozmowy społeczności, gildie, buildy, handel i wspólne wyprawy.</p>
        </div>

        <div className="guest-login-card auth-gateway-card">
          <span className="login-seal"><Shield aria-hidden="true" /></span>
          <p className="ledger-overline">{config.eyebrow}</p>
          <h2>{config.title}</h2>
          <p>{config.description}</p>

          {mode !== 'recovery' && <div className="auth-mode-tabs" role="tablist" aria-label="Rodzaj formularza"><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Logowanie</button><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Rejestracja</button></div>}

          <form className="auth-credentials-form" onSubmit={handleCredentials}>
            {mode === 'register' && <label><span>Nazwa w portalu</span><span className="auth-input-wrap"><UserRoundPlus aria-hidden="true" /><input name="name" autoComplete="nickname" minLength={2} maxLength={50} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="np. Szewcu" required /></span></label>}
            <label><span>Adres e-mail</span><span className="auth-input-wrap"><AtSign aria-hidden="true" /><input name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="twoj@email.pl" required /></span></label>
            {mode !== 'recovery' && <label><span>Hasło</span><span className="auth-input-wrap"><KeyRound aria-hidden="true" /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••••" required /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>}
            {mode === 'register' && <><PasswordRequirements password={form.password} /><label><span>Powtórz hasło</span><span className="auth-input-wrap"><KeyRound aria-hidden="true" /><input name="confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirmation} onChange={(event) => setForm({ ...form, confirmation: event.target.value })} placeholder="Powtórz hasło" required /></span></label></>}

            {mode === 'login' && <button type="button" className="auth-text-action" onClick={() => changeMode('recovery')}>Nie pamiętam hasła</button>}
            {mode === 'recovery' && <button type="button" className="auth-text-action" onClick={() => changeMode('login')}>Wróć do logowania</button>}
            <button type="submit" disabled={!canSubmit || Boolean(busy)} className="btn btn-primary auth-submit">{busy === mode ? <LoaderCircle className="spin" aria-hidden="true" /> : mode === 'register' ? <UserRoundPlus aria-hidden="true" /> : mode === 'recovery' ? <MailCheck aria-hidden="true" /> : <KeyRound aria-hidden="true" />}{mode === 'login' ? 'Wejdź do portalu' : mode === 'register' ? 'Utwórz konto' : 'Wyślij link resetujący'}</button>
          </form>

          {success && <div role="status" className="auth-form-notice success"><MailCheck aria-hidden="true" /><span>{success}</span>{mode === 'register' && <button type="button" disabled={Boolean(busy)} onClick={resendConfirmation}>{busy === 'resend' ? 'Wysyłanie…' : 'Wyślij ponownie'}</button>}</div>}
          {authError && <p role="alert" className="welcome-error auth-form-notice error">{authError}</p>}

          {mode !== 'recovery' && <><div className="auth-divider"><span>lub użyj</span></div><div className="auth-oauth-grid"><button type="button" className="auth-oauth-button google" onClick={() => startOAuth('google')} disabled={Boolean(busy)}><Image className="oauth-brand-mark google" src="/brands/google-g.svg" width={20} height={20} alt="" aria-hidden="true" unoptimized />{busy === 'google' ? 'Łączenie…' : 'Google'}</button><button type="button" className="auth-oauth-button discord" onClick={() => startOAuth('discord')} disabled={Boolean(busy)}><Image className="oauth-brand-mark discord" src="/brands/discord-mark.svg" width={23} height={18} alt="" aria-hidden="true" unoptimized />{busy === 'discord' ? 'Łączenie…' : 'Discord'}</button></div><p className="auth-discord-hint">Discord pozostaje wymagany tylko przy funkcjach komunikujących się z serwerami społeczności. Połączysz go również później w profilu.</p></>}

          <div className="guest-login-trust"><span><span className="status-dot online" /> Portal aktywny</span><span><Compass aria-hidden="true" /> Europa · Ameryka · Azja</span></div>
          <small>Zakładając konto lub logując się, akceptujesz <Link href="/regulamin">regulamin</Link> i <Link href="/prywatnosc">politykę prywatności</Link>.</small>
        </div>
      </section>

      <footer className="guest-footer"><Link href="/" className="guest-footer-brand"><Image src="/logo-256.webp" alt="" width={34} height={34} /><span><strong>Albion Polska</strong><small>Portal społeczności graczy</small></span></Link><p>Nieoficjalny projekt społecznościowy. Albion Online jest własnością Sandbox Interactive GmbH.</p><nav aria-label="Stopka"><Link href="/regulamin">Regulamin</Link><Link href="/prywatnosc">Prywatność</Link></nav></footer>
    </div>
  )
}
