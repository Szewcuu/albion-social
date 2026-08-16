import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Kreator buildu Albion Online',
  description: 'Stwórz i opublikuj własną doktrynę ekwipunku Albion Online.',
  path: '/buildy/create',
})

export default function BuildCreatorLayout({ children }) { return children }
