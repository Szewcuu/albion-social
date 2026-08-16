import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import PwaRegister from "@/components/PwaRegister";
import AppShell from "@/components/AppShell";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
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
    description: 'Ogólnopolski portal graczy Albion Online — zbrojownia buildów, rynek P2P, kalkulatory craftingu, killboard i gildie.',
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Albion Online Polska Portal Banner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Albion Online Polska Portal',
    description: 'Baza wiedzy, zbrojownia buildów, rynek P2P i społeczność polskich gildii w Albion Online.',
    images: [DEFAULT_OG_IMAGE],
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
    <html lang="pl" className="h-full antialiased">
      <head>
        <link rel="preload" href="/albion-bg.webp" as="image" fetchPriority="high" />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <PwaRegister />
        <WebVitalsReporter />
        <SpeedInsights />
      </body>
    </html>
  );
}
