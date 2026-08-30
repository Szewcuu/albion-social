'use client'

import { useEffect } from 'react'
import { scheduleIdleTask } from '@/lib/clientIdle'

export default function DeferredRuntimeServices() {
  useEffect(() => scheduleIdleTask(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
    }

    if (!document.querySelector('script[data-aopp-speed-insights]')) {
      const script = document.createElement('script')
      script.src = '/_vercel/speed-insights/script.js'
      script.defer = true
      script.dataset.aoppSpeedInsights = 'true'
      script.dataset.sdkn = '@vercel/speed-insights/next'
      document.head.appendChild(script)
    }
  }, { minimumDelay: 7_000, timeout: 2_000 }), [])

  return null
}
