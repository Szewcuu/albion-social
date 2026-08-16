import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Wyprawy, Party & Zbiórki Grupowe',
  description: 'Planer wypraw i zbiórek grupowych w Albion Online. Organizuj rajdy na statyki, grupy gankingowe i ZvZ z automatyczną weryfikacją IP.',
  path: '/wyprawy',
})

export default function WyprawyLayout({ children }) {
  return children
}
