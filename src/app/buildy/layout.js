import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Kuźnia Buildów & Zestawy PvP/PvE',
  description: 'Zbrojownia buildów graczy Albion Online. Odkrywaj zestawy bojowe, porównuj ekwipunek, wyceniaj koszty i sprawdzaj dps.',
  path: '/buildy',
})

export default function BuildyLayout({ children }) {
  return children
}
