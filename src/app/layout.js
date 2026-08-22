import "./globals.css";

import AppShell from "@/components/AppShell";
import DeferredRuntimeServices from "@/components/DeferredRuntimeServices";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";
import { getServerPortalUser } from "@/lib/server/supabaseSession";

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

export default async function RootLayout({ children }) {
  const initialUser = await getServerPortalUser();

  return (
    <html lang="pl" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell initialUser={initialUser}>{children}</AppShell>
        <DeferredRuntimeServices />
      </body>
    </html>
  );
}
