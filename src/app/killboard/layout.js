import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Kroniki Walk & Wycena Ekwipunku',
  description: 'Killboard i historia starć w Albion Online. Wyszukuj walki graczy i gildii oraz sprawdzaj szacowaną wartość utraconego sprzętu.',
  path: '/killboard',
})

export default function KillboardLayout({ children }) {
  return children
}
