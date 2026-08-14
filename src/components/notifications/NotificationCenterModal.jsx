'use client'

import { useState } from 'react'
import { Bell, Check, Trash2, X, Swords, ShoppingBag, Shield, Sparkles } from 'lucide-react'
import { getFollowedItems } from '@/lib/followSystem'

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: '⚔️ Nowa Wyprawa Statyk T8',
    message: 'Lider "SirLancelot" organizuje zbiórkę na 19:00 UTC (min 1500 IP).',
    type: 'expedition',
    timestamp: '15 min temu',
    read: false,
    icon: Swords,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-400/30'
  },
  {
    id: 'notif-2',
    title: '🛒 Nowa Oferta na Rynku',
    message: 'Wystawiono Mamut Transportowy T8 w Caerleon za 145 000 000 Silver.',
    type: 'market',
    timestamp: '1 godz. temu',
    read: false,
    icon: ShoppingBag,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/30'
  },
  {
    id: 'notif-3',
    title: '🛡️ Obserwowana Gildia: CTA ZvZ',
    message: 'Gildia opublikowała nowy cel obrony zamku o 18:00 UTC.',
    type: 'guild',
    timestamp: '2 godz. temu',
    read: true,
    icon: Shield,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30'
  }
]

export default function NotificationCenterModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const followedCount = isOpen ? getFollowedItems().length : 0

  if (!isOpen) return null

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="panel w-full max-w-lg space-y-5 p-6 relative border-amber-400/30 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
        
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-black text-white">Centrum Powiadomień</h3>
                {unreadCount > 0 && (
                  <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                    {unreadCount} Nowe
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">Obserwujesz: <strong className="text-amber-300 font-mono">{followedCount}</strong> obiektów</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRZYCISKI AKCJI */}
        <div className="flex items-center justify-between text-xs font-mono">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="text-amber-300 hover:underline disabled:opacity-40 disabled:no-underline flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Oznacz wszystkie jako przeczytane
          </button>

          <button
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="text-rose-400 hover:underline disabled:opacity-40 disabled:no-underline flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Wyczyść
          </button>
        </div>

        {/* LISTA POWIADOMIEŃ */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-amber-400/50" />
              <p className="font-bold text-white text-sm">Brak powiadomień</p>
              <p className="text-xs text-gray-400">Gdy pojawią się nowe ogłoszenia lub wydarzenia, zobaczysz je tutaj.</p>
            </div>
          ) : (
            notifications.map(n => {
              const IconComp = n.icon
              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${n.bgColor} ${n.read ? 'opacity-60' : 'shadow-sm'}`}
                >
                  <div className={`p-2 rounded-xl bg-black/40 border border-white/10 shrink-0 ${n.color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-white">{n.title}</h4>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="pt-3 border-t border-white/8 text-center">
          <button onClick={onClose} className="btn btn-secondary w-full py-2.5 text-xs">
            Zamknij powiadomienia
          </button>
        </div>

      </div>
    </div>
  )
}
