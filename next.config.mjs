const developmentScriptPolicy = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${developmentScriptPolicy} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://cdn.discordapp.com https://render.albiononline.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.albiononline.com https://*.albion-online-data.com https://va.vercel-scripts.com https://*.vercel-insights.com",
  "upgrade-insecure-requests",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'render.albiononline.com',
        pathname: '/v1/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          // Blokuje możliwość osadzania strony w iframe na obcych witrynach (ochrona przed Clickjackingiem)
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Blokuje zgadywanie typów MIME przez przeglądarkę
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Ogranicza przesyłanie informacji o stronie odsyłającej (Referrer)
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Wymusza połączenie szyfrowane HTTPS (HSTS) z wymogiem wpisu do listy preload
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Izolacja kontekstu najwyższego poziomu (COOP)
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Blokuje niechciane funkcje przeglądarki (geolokalizacja, mikrofon, kamera)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
