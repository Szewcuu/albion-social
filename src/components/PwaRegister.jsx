'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {
        console.warn('Service Worker PWA nie został zarejestrowany.')
      })
  }, []);

  return null;
}
