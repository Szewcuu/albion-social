export default function Loading() {
  return (
    <div className="page-content">
      <div className="subpage-header">
        <div className="h-8 w-56 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-4 w-40 bg-white/5 rounded-lg animate-pulse mt-2" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8 mt-2 space-y-4">
        <div className="panel p-6 flex gap-6 items-start">
          <div className="w-24 h-24 bg-white/5 rounded-2xl animate-pulse shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-56 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-4 w-full max-w-xs bg-white/5 rounded-lg animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-6 w-20 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="panel p-4 h-24 animate-pulse bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
