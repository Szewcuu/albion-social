import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Centrum aktywności',
  description: 'Odpowiedzi, polubienia, zaproszenia do wypraw i wiadomości handlowe w jednym miejscu.',
  path: '/aktywnosc',
})

export default function ActivityLayout({ children }) { return children }
