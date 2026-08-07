import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import PwaRegister from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Albion Online Polska Portal",
  description: "Polski węzeł społecznościowy graczy Albion Online",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-256.webp',
  },
};

export const viewport = {
  themeColor: "#c59b27",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#080506] text-[#bcbbc2] font-sans relative selection:bg-[#c59b27] selection:text-black">
        {/* GLOBALNE WARSTWY KRWISTO-ZŁOTEGO TŁA CAERLEON */}
        <div className="fixed inset-0 bg-gradient-to-b from-[#1b0a0d] via-[#0d0708] to-[#050304] z-0 pointer-events-none"></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/30 via-transparent to-transparent z-0 pointer-events-none"></div>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-[#c59b27]/10 via-transparent to-transparent z-0 pointer-events-none"></div>

        {/* GLÓWNA TREŚĆ STRONY */}
        <div className="relative z-10 flex flex-col min-h-screen flex-1">
          {children}
        </div>

        <PwaRegister />
        <SpeedInsights />
      </body>
    </html>
  );
}
