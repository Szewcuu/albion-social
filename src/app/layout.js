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
  title: "Albion Online Polska Portal",
  description: "Polska społeczność graczy Albion Online — gildie, buildy, rynek, wyprawy i więcej",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-256.webp',
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
