import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Rejestr Polskich Gildii & Rekrutacja',
  description: 'Spis i rekrutacja polskich gildii w Albion Online. Znajdź swoją gildię ZvZ, PvE lub gankingową na serwerze Europa, Ameryka i Azja.',
  path: '/gildie',
})

export default function GildieLayout({ children }) {
  return children
}
