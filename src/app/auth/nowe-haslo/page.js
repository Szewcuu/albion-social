'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'
import { friendlyAuthError, validatePortalPassword } from '@/lib/authFlow'
import { portalAuth } from '@/lib/supabaseAuth'

export default function NewPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const validation = useMemo(() => validatePortalPassword(password), [password])

  useEffect(() => {
    portalAuth.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session))
      setSessionReady(true)
    })
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (!validation.valid || password !== confirmation || busy) return
    setBusy(true)
    setMessage(null)
    const { error } = await portalAuth.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage({ type: 'error', text: friendlyAuthError(error, 'Nie udało się ustawić nowego hasła. Poproś o nowy link.') })
      return
    }
    setMessage({ type: 'success', text: 'Nowe hasło zostało zapisane. Możesz wrócić do portalu.' })
  }

  return (
    <div className="auth-reset-page">
      <section className="auth-reset-card" aria-labelledby="new-password-title">
        <span className="auth-reset-seal"><ShieldCheck aria-hidden="true" /></span>
        <p className="ledger-overline">Odzyskanie dostępu</p>
        <h1 id="new-password-title">Ustaw nowe hasło</h1>
        {!sessionReady ? (
          <div className="auth-reset-status"><LoaderCircle className="spin" /> Sprawdzanie bezpiecznego linku…</div>
        ) : !hasSession ? (
          <div className="auth-form-notice error">Link jest nieważny albo wygasł. Wróć do logowania i poproś o nową wiadomość.</div>
        ) : message?.type === 'success' ? (
          <><div className="auth-form-notice success"><Check />{message.text}</div><Link href="/" className="btn btn-primary auth-submit">Przejdź do portalu</Link></>
        ) : (
          <form className="auth-credentials-form" onSubmit={submit}>
            <label><span>Nowe hasło</span><span className="auth-input-wrap"><KeyRound /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
            <div className="auth-password-rules"><span className={validation.checks.length ? 'valid' : ''}><Check /> 10 znaków</span><span className={validation.checks.letter ? 'valid' : ''}><Check /> litera</span><span className={validation.checks.number ? 'valid' : ''}><Check /> cyfra</span><span className={validation.checks.special ? 'valid' : ''}><Check /> znak specjalny</span></div>
            <label><span>Powtórz nowe hasło</span><span className="auth-input-wrap"><KeyRound /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></span></label>
            {confirmation && password !== confirmation && <div className="auth-form-notice error">Wpisane hasła nie są identyczne.</div>}
            {message?.type === 'error' && <div className="auth-form-notice error">{message.text}</div>}
            <button type="submit" disabled={!validation.valid || password !== confirmation || busy} className="btn btn-primary auth-submit">{busy ? <LoaderCircle className="spin" /> : <KeyRound />}{busy ? 'Zapisywanie…' : 'Zapisz nowe hasło'}</button>
          </form>
        )}
        <Link href="/" className="auth-reset-back">Wróć do strony logowania</Link>
      </section>
    </div>
  )
}
