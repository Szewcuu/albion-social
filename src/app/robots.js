import { absoluteUrl } from '@/lib/seo'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/regulamin', '/prywatnosc'],
      disallow: [
        '/admin', '/api/', '/auth/', '/buildy', '/gildie', '/kalendarz',
        '/kalkulator-craftingu', '/killboard', '/loot-split', '/obserwowane',
        '/profil', '/rynek', '/timery', '/wiadomosci', '/wyprawy',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
