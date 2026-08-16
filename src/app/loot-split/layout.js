import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Kalkulator Podziału Łupów (Loot Split)',
  description: 'Narzędzie do automatycznego rozliczania łupów z rajdu w Albion Online. Przeliczaj zysk i udział każdego gracza z uwzględnieniem opłat.',
  path: '/loot-split',
})

export default function LootSplitLayout({ children }) {
  return children
}
