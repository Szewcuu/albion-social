'use client'

import dynamic from 'next/dynamic'
import { usePortalSession } from '@/contexts/PortalSessionContext'
import { SkeletonBlock } from '@/components/ui/FeedbackState'

const GuestGateway = dynamic(() => import('@/components/home/GuestGateway'))
const MemberTavern = dynamic(() => import('@/components/home/MemberTavern'), {
  loading: () => (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6" role="status" aria-label="Otwieranie Tawerny">
      <SkeletonBlock className="panel min-h-[96px]" />
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <SkeletonBlock className="panel min-h-[640px] lg:col-span-7" />
        <SkeletonBlock className="panel min-h-[240px] lg:col-span-5" />
      </div>
    </div>
  ),
})

export default function Home() {
  const { user } = usePortalSession()
  return user ? <MemberTavern /> : <GuestGateway />
}
