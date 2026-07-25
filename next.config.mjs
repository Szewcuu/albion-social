/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
          // Wymusza połączenie szyfrowane HTTPS (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
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