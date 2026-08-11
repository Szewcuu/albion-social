'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Błąd ładowania profilu gildii:', error)
  }, [error])

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Nie udało się załadować gildii</h1>
        <p>Wystąpił błąd podczas pobierania danych formacji.</p>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[900px] p-4 sm:p-6 lg:p-8 mt-2">
        <div className="panel p-8 text-center space-y-5">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <div>
            <p className="font-display text-lg font-bold text-white">Coś poszło nie tak</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{error?.message || 'Dane gildii mogą być niedostępne.'}</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={reset} className="btn btn-primary px-5 py-2.5 text-xs font-bold">
              Spróbuj ponownie
            </button>
            <Link href="/gildie" className="btn btn-ghost px-5 py-2.5 text-xs font-bold flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Rejestr Gildii
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
