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
    <div className="relative bg-[#120a0c] border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-2xl overflow-hidden group">
      
      {/* Tło z gradientem i opcjonalną grafiką / poświatą */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1b0a0d] via-[#120a0c]/90 to-[#080506] z-0"></div>
      
      {/* Dynamiczna poświata w zależności od typu aktywności (opcjonalnie) */}
      {activityType && (
        <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-[#c59b27]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#c59b27]/20 transition-all duration-700"></div>
      )}

      {/* Treść baneru */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0d0708] border border-[#3a1a1e] rounded shadow-inner text-[#c59b27]">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
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