import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Rynek P2P & Ogłoszenia Handlowe',
  description: 'Tablica ogłoszeń handlowych P2P graczy Albion Online. Kupuj i sprzedawaj wierzchowce, ekwipunek i surowce w miastach królewskich.',
  path: '/rynek',
})

export default function RynekLayout({ children }) {
  return children
}
