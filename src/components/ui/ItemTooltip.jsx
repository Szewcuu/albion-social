export default function ItemTooltip({ label, children, className = '' }) {
  if (!label) return children

  return (
    <span className={`group/item relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+.55rem)] left-1/2 z-[120] w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-lg border border-amber-300/25 bg-[#100a07]/98 px-2.5 py-1.5 text-center font-mono text-[9px] font-bold leading-4 text-amber-100 opacity-0 shadow-[0_12px_34px_rgba(0,0,0,.7)] transition duration-150 group-hover/item:translate-y-0 group-hover/item:opacity-100 group-focus-within/item:translate-y-0 group-focus-within/item:opacity-100"
      >
        {label}
        <span aria-hidden="true" className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-amber-300/25 bg-[#100a07]" />
      </span>
    </span>
  )
}
