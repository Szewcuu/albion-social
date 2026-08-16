import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Profil gracza Albion Online',
  description: 'Karta postaci, osiągnięcia i aktywność gracza w społeczności Albion Social.',
  path: '/profil',
})

export default function ProfileLayout({ children }) { return children }
