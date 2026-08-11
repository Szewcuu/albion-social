import { Cinzel, Lora } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import PwaRegister from "@/components/PwaRegister";
import AppShell from "@/components/AppShell";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "latin-ext"],
});

export const metadata = {
  metadataBase: new URL('https://albion-social.vercel.app'),
  title: {
    default: "Albion Online Polska Portal | Zbrojownia, Rynek & Gildie",
    template: "%s | Albion Social"
  },
  description: "Ogólnopolski portal i zbrojownia graczy Albion Online — porównywarka buildów, rynek P2P, kalkulatory craftingu, killboard i gildie.",
  keywords: ["Albion Online", "Albion Polska", "Buildy Albion", "Kalkulator Craftingu Albion", "Rynek Albion", "Gildie Albion", "Killboard Albion"],
  authors: [{ name: "Szewcuu" }],
  creator: "Szewcuu",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-256.webp',
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: 'https://albion-social.vercel.app',
    title: 'Albion Online Polska Portal',
    description: 'Ogólnopolski portal graczy Albion Online — gildie, zbrojownia buildów, rynek P2P i wyceny rynkowe.',
    siteName: 'Albion Social',
    images: [
      {
        url: '/logo-256.webp',
        width: 256,
        height: 256,
        alt: 'Albion Online Polska Portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Albion Online Polska Portal',
    description: 'Baza wiedzy, zbrojownia buildów, rynek P2P i społeczność polskich gildii w Albion Online.',
    images: ['/logo-256.webp'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: "#120d09",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pl"
      className={`${cinzel.variable} ${lora.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/albion-bg.jpg" as="image" fetchPriority="high" />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <PwaRegister />
        <SpeedInsights />
      </body>
    </html>
  );
}
