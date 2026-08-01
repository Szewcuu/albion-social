import { SkeletonBlock } from '@/components/ui/FeedbackState'

export default function LoadingBuildDetail() {
  return (
    <main className="aopp-shell min-h-screen p-4 text-[#d5d0c6] sm:p-6 lg:p-8">
      <div className="relative z-10 mx-auto max-w-[1320px] space-y-5">
        <SkeletonBlock className="h-11 w-48" />
        <SkeletonBlock className="h-80 w-full" />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <SkeletonBlock className="h-[520px]" />
          <SkeletonBlock className="h-72" />
        </div>
      </div>
    </main>
  )
}
