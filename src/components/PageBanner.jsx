// src/components/PageBanner.jsx
import React from 'react'
import { Shield } from 'lucide-react'

export default function PageBanner({ 
  title, 
  subtitle, 
  icon: Icon = Shield, 
  bgImage = "https://render.albiononline.com/v1/item/T8_CAPEITEM_FW_CAERLEON.png", // Domyślne tło lub ikona
  activityType 
}) {
  return (
    <div className="aopp-panel group relative overflow-hidden rounded-[28px] p-6 sm:p-8">
      
      {/* Tło z gradientem i opcjonalną grafiką / poświatą */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#252117] via-[#12130f]/90 to-[#090a08]"></div>
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#f0cf77] via-[#b9872c] to-transparent"></div>
      
      {/* Dynamiczna poświata w zależności od typu aktywności (opcjonalnie) */}
      {activityType && (
        <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-[#c59b27]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#c59b27]/20 transition-all duration-700"></div>
      )}

      {/* Treść baneru */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-[#d2a84b]/30 bg-black/30 p-3 text-[#e3b952] shadow-inner">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-wide text-[#fffaf0] sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Duża, półprzezroczysta ikona / herb po prawej stronie */}
        <div className="hidden md:flex items-center justify-center opacity-15 group-hover:opacity-25 transition-opacity duration-500 transform group-hover:scale-105">
          <Icon className="w-24 h-24 text-[#c59b27]" />
        </div>

      </div>
    </div>
  )
}
