'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Compass, Flame, LogIn, Shield } from 'lucide-react'
import { usePortalSession } from '@/contexts/PortalSessionContext'

export default function GuestGateway() {
  const { loginWithDiscord: startDiscordLogin } = usePortalSession()
  const [loginBusy, setLoginBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  const loginWithDiscord = async () => {
    if (loginBusy) return
    setLoginBusy(true)
    setAuthError('')
    try {
      await startDiscordLogin()
    } catch {
      setAuthError('Nie udało się rozpocząć logowania Discord. Spróbuj ponownie.')
      setLoginBusy(false)
    }
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

        <div className="guest-login-card">
          <span className="login-seal"><Shield aria-hidden="true" /></span>
          <p className="ledger-overline">Brama do kompanii</p>
          <h2>Dołącz do Albion Polska</h2>
          <p>Zaloguj się kontem Discord, aby wejść do tawerny, publikować treści i korzystać z pełnych narzędzi portalu.</p>
          <button type="button" onClick={loginWithDiscord} disabled={loginBusy} className="btn btn-discord btn-hero">
            <LogIn aria-hidden="true" /> {loginBusy ? 'Otwieranie bramy…' : 'Wejdź przez Discord'}
          </button>
          {authError && <p role="alert" className="welcome-error">{authError}</p>}
          <div className="guest-login-trust"><span><span className="status-dot online" /> Portal aktywny</span><span><Compass aria-hidden="true" /> Europa · Ameryka · Azja</span></div>
          <small>Logując się, akceptujesz <Link href="/regulamin">regulamin</Link> i <Link href="/prywatnosc">politykę prywatności</Link>.</small>
        </div>
      </section>

      <footer className="guest-footer">
        <Link href="/" className="guest-footer-brand"><Image src="/logo-256.webp" alt="" width={34} height={34} /><span><strong>Albion Polska</strong><small>Portal społeczności graczy</small></span></Link>
        <p>Nieoficjalny projekt społecznościowy. Albion Online jest własnością Sandbox Interactive GmbH.</p>
        <nav aria-label="Stopka"><Link href="/regulamin">Regulamin</Link><Link href="/prywatnosc">Prywatność</Link></nav>
      </footer>
    </div>
  )
}
