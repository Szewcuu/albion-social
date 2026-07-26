'use client'
import { Suspense } from 'react'
import CreateBuildPage from './CreateBuildContent'

export default function Page() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#050305]">
        <div className="w-10 h-10 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <CreateBuildPage />
    </Suspense>
  )
}
