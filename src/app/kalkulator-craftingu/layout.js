import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Kalkulator Rafinacji, RRR i Zysku',
  description: 'Kalkulator rafinacji Albion Online oparty na pełnych recepturach, cenach materiałów, bonusach miast, Focusie, opłacie stanowiska i kosztach rynku.',
  path: '/kalkulator-craftingu',
})

export default function CraftingLayout({ children }) {
  return children
}
