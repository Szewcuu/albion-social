'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Share2,
  Sparkles,
  X,
} from 'lucide-react'

import { formatBuildDiscordText, renderBuildCardToCanvas } from '@/lib/buildCardGenerator'

export default function BuildExportModal({
  isOpen,
  onClose,
  build = {},
  author = '',
  url = '',
}) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState('image') // 'image' | 'discord'
  const [rendering, setRendering] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const canvasRef = useRef(null)

  const shareUrl = useMemo(() => {
    if (url) return url
    if (typeof window !== 'undefined') return window.location.href
    return 'https://albion-social.vercel.app'
  }, [url])

  const discordText = useMemo(() => (
    formatBuildDiscordText(build, { url: shareUrl, author })
  ), [author, build, shareUrl])

  const buildSlug = useMemo(() => {
    const raw = String(build.title || 'doktryna')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return raw || 'doktryna'
  }, [build.title])

  const generateCanvas = useCallback(async () => {
    if (!canvasRef.current) return
    setRendering(true)
    setStatusMessage('')
    try {
      await renderBuildCardToCanvas(canvasRef.current, build, { author, url: shareUrl })
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        setPreviewUrl(dataUrl)
      }
    } catch {
      setStatusMessage('Nie udało się wygenerować podglądu karty.')
    } finally {
      setRendering(false)
    }
  }, [author, build, shareUrl])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl('')
      setCopiedImage(false)
      setCopiedText(false)
      setStatusMessage('')
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = setTimeout(() => {
      void generateCanvas()
    }, 50)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [generateCanvas, isOpen, onClose])

  const handleCopyImage = async () => {
    if (!canvasRef.current) return
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setStatusMessage('Nie udało się przygotować pliku graficznego.')
          return
        }
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new window.ClipboardItem({ 'image/png': blob }),
            ])
            setCopiedImage(true)
            setStatusMessage('Grafika została skopiowana do schowka! Możesz wkleić ją (Ctrl+V) na Discordzie.')
            setTimeout(() => setCopiedImage(false), 3000)
          } else {
            setStatusMessage('Twoja przeglądarka nie obsługuje bezpośredniego kopiowania obrazu. Użyj przycisku Pobierz PNG.')
          }
        } catch {
          setStatusMessage('Nie udało się skopiować obrazu do schowka. Użyj przycisku Pobierz PNG.')
        }
      }, 'image/png')
    } catch {
      setStatusMessage('Błąd schowka. Użyj przycisku pobierania pliku.')
    }
  }

  const handleDownloadImage = () => {
    if (!canvasRef.current) return
    try {
      const link = document.createElement('a')
      link.download = `${buildSlug}-albion-social.png`
      link.href = canvasRef.current.toDataURL('image/png')
      link.click()
      setStatusMessage('Plik PNG został pobrany na Twój dysk!')
    } catch {
      setStatusMessage('Nie udało się pobrać pliku graficznego.')
    }
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(discordText)
      setCopiedText(true)
      setStatusMessage('Format tekstu na Discorda został skopiowany do schowka!')
      setTimeout(() => setCopiedText(false), 3000)
    } catch {
      setStatusMessage('Nie udało się skopiować tekstu do schowka.')
    }
  }

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      onClick={onClose}
    >
      <div
        className="panel relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-amber-300/30 bg-[#0e0907] shadow-[0_24px_80px_rgba(0,0,0,.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300 shadow-inner">
              <Share2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Zbrojownia • Eksport</p>
              <h2 id="export-modal-title" className="font-display text-lg font-black text-white sm:text-xl">
                Udostępnij doktrynę na Discordzie
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Zamknij okno eksportu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/8 bg-black/30 p-2 sm:px-6 gap-2 font-mono text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'image'}
            onClick={() => setTab('image')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 font-bold transition cursor-pointer ${
              tab === 'image'
                ? 'border border-amber-300/40 bg-amber-400/15 text-amber-200 shadow-sm'
                : 'border border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Karta Graficzna (PNG)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'discord'}
            onClick={() => setTab('discord')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 font-bold transition cursor-pointer ${
              tab === 'discord'
                ? 'border border-amber-300/40 bg-amber-400/15 text-amber-200 shadow-sm'
                : 'border border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Format Tekstowy (Discord)</span>
          </button>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {statusMessage && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-200 font-mono flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
              <span>{statusMessage}</span>
            </div>
          )}

          {tab === 'image' ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl flex items-center justify-center min-h-[260px] sm:min-h-[340px]">
                {/* Ukryty element Canvas do renderowania właściwego obrazu w pełnej rozdzielczości 1200x630 */}
                <canvas ref={canvasRef} className="hidden" />

                {rendering ? (
                  <div className="flex flex-col items-center gap-3 text-amber-200 p-8">
                    <LoaderCircle className="h-8 w-8 animate-spin" />
                    <span className="font-mono text-xs uppercase tracking-wider">Generowanie karty doktryny…</span>
                  </div>
                ) : previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt={`Wizualna karta buildu ${build.title || ''}`}
                    className="w-full h-auto object-contain rounded-xl select-none"
                  />
                ) : (
                  <div className="text-gray-500 font-mono text-xs">Przygotowywanie grafiki…</div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-gray-400 leading-relaxed max-w-md">
                  Karta 1200×630 px zawiera pełne zestawienie slotów, tiery, enchanty oraz autorskie oznaczenie doktryny.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    disabled={rendering || !previewUrl}
                    className="btn btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50"
                  >
                    {copiedImage ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedImage ? 'Skopiowano grafikę!' : 'Kopiuj obraz (Ctrl+V)'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={rendering || !previewUrl}
                    className="btn btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Pobierz PNG
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  readOnly
                  rows={13}
                  value={discordText}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-gray-200 outline-none focus:border-amber-300/40 select-all"
                  aria-label="Podgląd treści do wklejenia na Discorda"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-gray-400 leading-relaxed max-w-md">
                  Wiadomość zawiera emotikony i formatowanie Markdown, gotowe do bezpośredniego wklejenia na kanale Discord Twojej gildii.
                </p>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider"
                >
                  {copiedText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedText ? 'Skopiowano tekst!' : 'Kopiuj treść na Discorda'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
