import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Kalkulator Zysku z Craftingu & RRR',
  description: 'Kalkulator rzemiosła i przetwórstwa w Albion Online. Obliczaj czysty zysk netto uwzględniając bonusy miast (RRR %), skupienie i podatki.',
  path: '/kalkulator-craftingu',
})

export default function CraftingLayout({ children }) {
  return children
}
