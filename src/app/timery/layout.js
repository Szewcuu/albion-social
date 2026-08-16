import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Timery Światowe, ZvZ & Okna Strategiczne',
  description: 'Harmonogram i zegary światowe Albion Online. Śledź konserwacje serwera, wojny gildijne ZvZ, zamki oraz strefy aktywności.',
  path: '/timery',
})

export default function TimeryLayout({ children }) {
  return children
}
