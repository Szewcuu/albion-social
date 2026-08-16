import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Obserwowane postacie i treści',
  description: 'Prywatna lista obserwowanych graczy, gildii, buildów i ofert rynku Albion Online.',
  path: '/obserwowane',
})

export default function FollowedLayout({ children }) { return children }
