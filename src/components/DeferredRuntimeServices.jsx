'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { scheduleIdleTask } from '@/lib/clientIdle'

const PwaRegister = dynamic(() => import('./PwaRegister'), { ssr: false })
const WebVitalsReporter = dynamic(() => import('./WebVitalsReporter'), { ssr: false })
const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((module) => module.SpeedInsights),
  { ssr: false },
)

export default function DeferredRuntimeServices() {
  const [ready, setReady] = useState(false)

  useEffect(() => scheduleIdleTask(
    () => setReady(true),
    { minimumDelay: 7_000, timeout: 2_000 },
  ), [])

  if (!ready) return null

  return (
    <>
      <WebVitalsReporter />
      <PwaRegister />
      <SpeedInsights />
    </>
  )
}
