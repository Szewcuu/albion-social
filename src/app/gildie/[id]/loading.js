export default function Loading() {
  return (
    <div className="page-content">
      <div className="subpage-header">
        <div className="h-8 w-64 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-4 w-48 bg-white/5 rounded-lg animate-pulse mt-2" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8 mt-2 space-y-4">
        <div className="panel p-6 space-y-4">
          <div className="h-6 w-48 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
